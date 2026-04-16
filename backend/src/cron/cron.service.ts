import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NotificationType, ReminderDispatchKind } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  addCalendarDaysYmd,
  calendarYmdInTimeZone,
  isCohortInActiveWeeklyDigestWindow,
  isFellowCohortInActiveProgramWindow,
  nextCalendarYmd,
  resolveCohortForWeeklyDigest,
  resolveCohortTimeZone,
} from './weekly-digest-eligibility';
import { DiscussionsService } from '../discussions/discussions.service';
import {
  daysLeftForQuizClosingKind,
  quizClosingReminderKindsForToday,
  QUIZ_REMINDER_DISPATCH,
} from './quiz-reminder-stages';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  /**
   * Archive monthly leaderboard and reset monthly points.
   * Runs at 00:00 UTC on the 1st of every month.
   */
  @Cron('0 0 1 * *')
  async archiveMonthlyLeaderboard() {
    this.logger.log('Running monthly leaderboard archival...');

    const now = new Date();
    // Use previous month for archiving (job runs on 1st of new month)
    const archiveDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = archiveDate.getMonth() + 1; // 1-12
    const year = archiveDate.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true, name: true },
    });

    for (const cohort of activeCohorts) {
      try {
        // Skip if already archived for this month
        const existing = await this.prisma.monthlyLeaderboard.findUnique({
          where: { cohortId_month_year: { cohortId: cohort.id, month, year } },
        });
        if (existing) continue;

        // Get fellows ranked by points earned this month
        const pointsThisMonth = await this.prisma.pointsLog.groupBy({
          by: ['userId'],
          where: {
            user: { cohortId: cohort.id, role: 'FELLOW' },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { points: true },
          orderBy: { _sum: { points: 'desc' } },
        });

        const leaderboard = await this.prisma.monthlyLeaderboard.create({
          data: { cohortId: cohort.id, month, year, startDate, endDate },
        });

        const rankedEntries = pointsThisMonth.map((p, index) => ({
          leaderboardId: leaderboard.id,
          userId: p.userId,
          rank: index + 1,
          totalPoints: p._sum.points ?? 0,
        }));

        if (rankedEntries.length > 0) {
          await this.prisma.leaderboardEntry.createMany({
            data: rankedEntries,
          });

          // Award rank-based achievements for fellows who placed in top positions.
          // These are checked here (not in checkAndAwardAchievements) because rank
          // is a "≤" comparison and is only known at month-end.
          const rankAchievements = await this.prisma.achievement.findMany({
            where: { name: { in: ['Monthly Champion', 'Top 10 Finisher'] } },
            select: { id: true, name: true, pointValue: true },
          });

          for (const entry of rankedEntries) {
            for (const ach of rankAchievements) {
              const maxRank = ach.name === 'Monthly Champion' ? 1 : 10;
              if (entry.rank > maxRank) continue;

              const alreadyUnlocked =
                await this.prisma.userAchievement.findUnique({
                  where: {
                    userId_achievementId: {
                      userId: entry.userId,
                      achievementId: ach.id,
                    },
                  },
                });
              if (alreadyUnlocked) continue;

              await this.prisma.userAchievement.create({
                data: {
                  userId: entry.userId,
                  achievementId: ach.id,
                  unlockedAt: new Date(),
                },
              });
              if (ach.pointValue > 0) {
                await this.prisma.pointsLog.create({
                  data: {
                    userId: entry.userId,
                    points: ach.pointValue,
                    eventType: 'ADMIN_ADJUSTMENT' as any,
                    description: `Achievement unlocked: ${ach.name}`,
                  },
                });
              }
            }
          }
        }

        this.logger.log(
          `Archived leaderboard for cohort ${cohort.name} (${month}/${year})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to archive leaderboard for cohort ${cohort.id}: ${err}`,
        );
      }
    }

    // Reset monthly points for all users
    await this.prisma.user.updateMany({
      data: { currentMonthPoints: 0, lastPointReset: now },
    });

    this.logger.log('Monthly leaderboard archival complete. Points reset.');
  }

  /**
   * Send weekly digest emails to opted-in users.
   * Runs every Monday at 08:00 UTC.
   */
  @Cron('0 8 * * 1')
  async sendWeeklyDigests() {
    this.logger.log('Sending weekly digest emails...');

    const users = await this.prisma.user.findMany({
      where: { weeklyDigest: true, isSuspended: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        cohortId: true,
      },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const now = new Date();
    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );

    let sent = 0;
    for (const user of users) {
      try {
        if (user.role === 'GUEST_FACILITATOR') {
          this.logger.log(
            `Weekly digest skipped for ${user.email}: guest facilitator`,
          );
          continue;
        }

        const digestCohort = await resolveCohortForWeeklyDigest(
          this.prisma,
          user,
          now,
        );
        if (!digestCohort) {
          this.logger.log(
            `Weekly digest skipped for ${user.email}: no eligible cohort (window, state, or sessions)`,
          );
          continue;
        }

        const cohortScope = { cohortId: digestCohort.id };

        if (user.role === 'FELLOW') {
          // Fellows: personal progress + leaderboard rank (cohort must match resolved digest cohort)
          const [
            resourcesCompleted,
            pointsThisWeek,
            cohortFellowCount,
            rankEntry,
          ] = await Promise.all([
            this.prisma.resourceProgress.count({
              where: {
                userId: user.id,
                state: 'COMPLETED',
                completedAt: { gte: oneWeekAgo },
              },
            }),
            this.prisma.pointsLog.aggregate({
              where: { userId: user.id, createdAt: { gte: oneWeekAgo } },
              _sum: { points: true },
            }),
            this.prisma.user.count({
              where: { cohortId: digestCohort.id, role: 'FELLOW' },
            }),
            this.prisma.pointsLog.groupBy({
              by: ['userId'],
              where: {
                user: { cohortId: digestCohort.id, role: 'FELLOW' },
                createdAt: { gte: oneWeekAgo },
              },
              _sum: { points: true },
              orderBy: { _sum: { points: 'desc' } },
            }),
          ]);

          const weeklyPoints = pointsThisWeek._sum.points ?? 0;
          const rankList = rankEntry as Array<{
            userId: string;
            _sum: { points: number | null };
          }>;
          const rank = rankList.findIndex((r) => r.userId === user.id) + 1 || 1;

          await this.emailService.sendWeeklySummaryEmail(user.email, {
            firstName: user.firstName,
            weekNumber,
            resourcesCompleted,
            pointsEarned: weeklyPoints,
            rank,
            totalParticipants: cohortFellowCount,
          });
        } else {
          // Facilitators & Admins: cohort-wide engagement summary (always scoped to one cohort — never global)
          const fellowScope = { ...cohortScope, role: 'FELLOW' as const };
          const [
            activeFellows,
            resourcesThisWeek,
            pointsThisWeek,
            totalFellows,
          ] = await Promise.all([
            this.prisma.resourceProgress
              .groupBy({
                by: ['userId'],
                where: { completedAt: { gte: oneWeekAgo }, user: fellowScope },
                _count: { userId: true },
              })
              .then((r) => r.length),
            this.prisma.resourceProgress.count({
              where: {
                state: 'COMPLETED',
                completedAt: { gte: oneWeekAgo },
                user: fellowScope,
              },
            }),
            this.prisma.pointsLog.aggregate({
              where: { createdAt: { gte: oneWeekAgo }, user: fellowScope },
              _sum: { points: true },
            }),
            this.prisma.user.count({
              where: { ...fellowScope, isSuspended: false },
            }),
          ]);

          const totalPoints = pointsThisWeek._sum.points ?? 0;
          await this.emailService.sendNotificationEmail(user.email, {
            firstName: user.firstName,
            title: `Week ${weekNumber} Cohort Summary`,
            message:
              `Here's how your cohort performed this week:\n\n` +
              `• ${activeFellows} of ${totalFellows} fellows were active\n` +
              `• ${resourcesThisWeek} resources completed across the cohort\n` +
              `• ${totalPoints} total points earned by fellows`,
            actionUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
            actionText: 'View Dashboard',
          });
        }

        sent++;
      } catch (err) {
        this.logger.warn(`Failed to send digest to ${user.email}: ${err}`);
      }
    }

    this.logger.log(`Weekly digest sent to ${sent}/${users.length} users`);
  }

  /**
   * Notify fellows when a resource becomes available by session unlock date
   * (DB state can stay LOCKED; fellows see it via date rule).
   * Runs daily at 06:00 UTC.
   */
  @Cron('0 6 * * *')
  async notifyResourcesUnlockedByDate() {
    const now = new Date();
    const notified = await this.prisma.resourceDateUnlockNotification.findMany({
      select: { resourceId: true },
    });
    const skipIds = notified.map((n) => n.resourceId);

    const resources = await this.prisma.resource.findMany({
      where: {
        state: 'LOCKED',
        ...(skipIds.length > 0 ? { id: { notIn: skipIds } } : {}),
        session: {
          unlockDate: { lte: now },
          cohort: { state: 'ACTIVE' },
        },
      },
      include: {
        session: { include: { cohort: true } },
      },
    });

    let count = 0;
    for (const r of resources) {
      const cohort = r.session.cohort;
      if (!isCohortInActiveWeeklyDigestWindow(cohort, now)) continue;
      try {
        await this.notificationsService.notifyFellowsResourceUnlocked(
          r.id,
          cohort.id,
          r.title,
          r.session.title,
        );
        await this.prisma.resourceDateUnlockNotification.create({
          data: { resourceId: r.id },
        });
        count++;
      } catch (err) {
        this.logger.warn(
          `Date-unlock notify failed for resource ${r.id}: ${err}`,
        );
      }
    }

    if (count > 0) {
      this.logger.log(
        `Date-based unlock notifications for ${count} resource(s)`,
      );
    }
  }

  /**
   * Session / quiz / incomplete-resource reminders (cohort local calendar).
   * Runs daily at 07:00 UTC.
   */
  @Cron('0 7 * * *')
  async sendProgramReminders() {
    const now = new Date();
    const cohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
    });

    for (const cohort of cohorts) {
      if (!isCohortInActiveWeeklyDigestWindow(cohort, now)) continue;

      const tz = resolveCohortTimeZone(cohort);
      const todayYmd = calendarYmdInTimeZone(now, tz);
      const tomorrowYmd = nextCalendarYmd(todayYmd);
      const sessionDueYmd = addCalendarDaysYmd(todayYmd, 3);

      const fellows = await this.prisma.user.findMany({
        where: { cohortId: cohort.id, role: 'FELLOW', isSuspended: false },
        select: { id: true, email: true, firstName: true },
      });
      if (fellows.length === 0) continue;

      const sessions = await this.prisma.session.findMany({
        where: { cohortId: cohort.id },
      });

      for (const session of sessions) {
        if (calendarYmdInTimeZone(session.scheduledDate, tz) === tomorrowYmd) {
          for (const fellow of fellows) {
            const dispatched = await this.prisma.reminderDispatch.findUnique({
              where: {
                kind_userId_entityId: {
                  kind: ReminderDispatchKind.SESSION_UPCOMING,
                  userId: fellow.id,
                  entityId: session.id,
                },
              },
            });
            if (dispatched) continue;
            try {
              await this.notificationsService.notifySessionReminder(
                fellow.id,
                session.title,
                session.id,
                session.scheduledDate,
              );
              await this.prisma.reminderDispatch.create({
                data: {
                  kind: ReminderDispatchKind.SESSION_UPCOMING,
                  userId: fellow.id,
                  entityId: session.id,
                },
              });
            } catch {
              // non-critical
            }
          }
        }

        if (
          calendarYmdInTimeZone(session.scheduledDate, tz) === sessionDueYmd
        ) {
          const coreResources = await this.prisma.resource.findMany({
            where: { sessionId: session.id, isCore: true },
            select: { id: true, title: true },
          });
          for (const resource of coreResources) {
            for (const fellow of fellows) {
              const progress = await this.prisma.resourceProgress.findUnique({
                where: {
                  userId_resourceId: {
                    userId: fellow.id,
                    resourceId: resource.id,
                  },
                },
              });
              if (progress?.state === 'COMPLETED') continue;

              const dispatched = await this.prisma.reminderDispatch.findUnique({
                where: {
                  kind_userId_entityId: {
                    kind: ReminderDispatchKind.INCOMPLETE_RESOURCE,
                    userId: fellow.id,
                    entityId: resource.id,
                  },
                },
              });
              if (dispatched) continue;
              try {
                await this.notificationsService.notifyIncompleteResource(
                  fellow.id,
                  resource.title,
                  resource.id,
                  3,
                );
                await this.prisma.reminderDispatch.create({
                  data: {
                    kind: ReminderDispatchKind.INCOMPLETE_RESOURCE,
                    userId: fellow.id,
                    entityId: resource.id,
                  },
                });
              } catch {
                // non-critical
              }
            }
          }
        }
      }

      const quizzesForCohort = await this.prisma.quiz.findMany({
        where: {
          OR: [
            { cohortId: cohort.id },
            { sessions: { some: { session: { cohortId: cohort.id } } } },
          ],
        },
        select: { id: true, title: true, openAt: true, closeAt: true },
      });

      for (const quiz of quizzesForCohort) {
        if (quiz.openAt) {
          const openYmd = calendarYmdInTimeZone(quiz.openAt, tz);
          if (openYmd === todayYmd) {
            for (const fellow of fellows) {
              const email = fellow.email?.trim();
              if (!email) continue;

              const dispatched = await this.prisma.reminderDispatch.findUnique({
                where: {
                  kind_userId_entityId: {
                    kind: QUIZ_REMINDER_DISPATCH.QUIZ_UNLOCK_EMAIL,
                    userId: fellow.id,
                    entityId: quiz.id,
                  },
                },
              });
              if (dispatched) continue;

              try {
                const sent = await this.emailService.sendQuizUnlockedEmail(email, {
                  firstName: fellow.firstName || 'there',
                  quizTitle: quiz.title,
                  quizId: quiz.id,
                  closeAt: quiz.closeAt,
                });
                if (!sent) continue;

                await this.prisma.reminderDispatch.create({
                  data: {
                    kind: QUIZ_REMINDER_DISPATCH.QUIZ_UNLOCK_EMAIL,
                    userId: fellow.id,
                    entityId: quiz.id,
                  },
                });

                const closeNote = quiz.closeAt
                  ? ` Complete it by ${quiz.closeAt.toLocaleDateString()}.`
                  : '';
                await this.notificationsService.createNotification({
                  userId: fellow.id,
                  type: NotificationType.QUIZ_UNLOCKED,
                  title: 'Quiz now open',
                  message: `"${quiz.title}" is now available.${closeNote}`,
                  data: { quizId: quiz.id, dueDate: quiz.closeAt },
                });
              } catch {
                // non-critical
              }
            }
          }
        }

        if (!quiz.closeAt) continue;
        const closeYmd = calendarYmdInTimeZone(quiz.closeAt, tz);
        const closingKinds = quizClosingReminderKindsForToday(
          todayYmd,
          tomorrowYmd,
          closeYmd,
        );
        if (closingKinds.length === 0) continue;

        for (const fellow of fellows) {
          const passed = await this.prisma.quizResponse.findFirst({
            where: { quizId: quiz.id, userId: fellow.id, passed: true },
          });
          if (passed) continue;

          for (const kind of closingKinds) {
            const dispatched = await this.prisma.reminderDispatch.findUnique({
              where: {
                kind_userId_entityId: {
                  kind,
                  userId: fellow.id,
                  entityId: quiz.id,
                },
              },
            });
            if (dispatched) continue;
            try {
              const daysLeft = daysLeftForQuizClosingKind(kind);
              await this.notificationsService.notifyQuizClosingSoon(
                fellow.id,
                quiz.title,
                quiz.id,
                quiz.closeAt,
                daysLeft,
              );
              await this.prisma.reminderDispatch.create({
                data: {
                  kind,
                  userId: fellow.id,
                  entityId: quiz.id,
                },
              });
            } catch {
              // non-critical
            }
          }
        }
      }
    }
  }

  /**
   * Nudge fellows who haven't completed core resources in 3+ days.
   * Runs every day at 09:00 UTC.
   */
  @Cron('0 9 * * *')
  async nudgeInactiveFellows() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const inactiveFellows = await this.prisma.user.findMany({
      where: {
        role: 'FELLOW',
        isSuspended: false,
        emailNotifications: true,
        cohortId: { not: null },
        OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: threeDaysAgo } }],
      },
      select: { id: true, email: true, firstName: true, cohortId: true },
    });

    const now = new Date();
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    let nudged = 0;
    for (const fellow of inactiveFellows) {
      try {
        const inWindow = await isFellowCohortInActiveProgramWindow(
          this.prisma,
          fellow.cohortId!,
          now,
        );
        if (!inWindow) continue;

        await this.emailService.sendNotificationEmail(fellow.email, {
          firstName: fellow.firstName,
          title: 'We miss you! Your cohort needs you',
          message:
            "You haven't been active in a few days. Log in to complete resources, earn points, and keep up with your cohort.",
          actionUrl: `${frontendUrl}/dashboard/fellow`,
          actionText: 'Get Back On Track',
        });
        nudged++;
      } catch (err) {
        this.logger.warn(`Failed to nudge ${fellow.email}: ${err}`);
      }
    }

    if (nudged > 0) {
      this.logger.log(`Sent nudge emails to ${nudged} inactive fellows`);
    }
  }

  /**
   * Alert staff about fellows who have been inactive for 5+ days.
   * Runs daily at 10:00 UTC (after the 09:00 nudge to fellows).
   */
  @Cron('0 10 * * *')
  async alertStaffInactiveFellows() {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const inactiveFellows = await this.prisma.user.findMany({
      where: {
        role: 'FELLOW',
        isSuspended: false,
        cohortId: { not: null },
        OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: fiveDaysAgo } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cohortId: true,
        lastLoginAt: true,
      },
    });

    let alerted = 0;
    for (const fellow of inactiveFellows) {
      const daysSince = fellow.lastLoginAt
        ? Math.floor(
            (Date.now() - fellow.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 999;

      // Only alert once per threshold (5, 10, 15 days) to avoid spam
      if (
        daysSince === 5 ||
        daysSince === 10 ||
        daysSince === 15 ||
        daysSince === 30
      ) {
        try {
          await this.notificationsService.notifyFellowInactivity(
            fellow.id,
            `${fellow.firstName} ${fellow.lastName}`,
            fellow.cohortId!,
            daysSince,
          );
          alerted++;
        } catch {
          // Non-critical
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(`Alerted staff about ${alerted} inactive fellows`);
    }
  }

  /**
   * Alert staff when fellows miss 3+ consecutive sessions.
   * Runs daily at 10:30 UTC.
   */
  @Cron('30 10 * * *')
  async alertStaffMissedSessions() {
    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true },
    });

    let alerted = 0;
    for (const cohort of activeCohorts) {
      // Get past sessions for this cohort (already scheduled)
      const pastSessions = await this.prisma.session.findMany({
        where: {
          cohortId: cohort.id,
          scheduledDate: { lt: new Date() },
        },
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        select: { id: true },
      });

      if (pastSessions.length < 3) continue;

      const fellows = await this.prisma.user.findMany({
        where: { cohortId: cohort.id, role: 'FELLOW', isSuspended: false },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const fellow of fellows) {
        // Check the last 3 sessions for attendance
        const last3SessionIds = pastSessions.slice(0, 3).map((s) => s.id);
        const attendanceCount = await this.prisma.attendance.count({
          where: {
            userId: fellow.id,
            sessionId: { in: last3SessionIds },
          },
        });

        if (attendanceCount === 0) {
          try {
            await this.notificationsService.notifyFellowMissedSessions(
              fellow.id,
              `${fellow.firstName} ${fellow.lastName}`,
              cohort.id,
              3,
            );
            alerted++;
          } catch {
            // Non-critical
          }
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(
        `Alerted staff about ${alerted} fellows with consecutive missed sessions`,
      );
    }
  }

  /**
   * Send email reminders for unread DMs older than 2 hours.
   * Runs every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async remindUnreadDMs() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find DM channels with messages sent 2–48 hours ago
    const dmChannels = await this.prisma.channel.findMany({
      where: {
        type: 'DIRECT_MESSAGE',
        isArchived: false,
        messages: {
          some: {
            createdAt: { gte: twoDaysAgo, lte: twoHoursAgo },
            isDeleted: false,
          },
        },
      },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { userId: true, createdAt: true, content: true },
        },
      },
    });

    let reminded = 0;
    for (const channel of dmChannels) {
      const lastMessage = channel.messages[0];
      if (!lastMessage) continue;
      if (lastMessage.createdAt > twoHoursAgo) continue;

      // Extract participants from dm::userId1::userId2
      const parts = channel.name.split('::');
      if (parts.length !== 3 || parts[0] !== 'dm') continue;
      const participantIds = [parts[1], parts[2]];

      // Recipient is the other participant (not the sender)
      const recipientId = participantIds.find(
        (id) => id !== lastMessage.userId,
      );
      if (!recipientId) continue;

      // Check if recipient has read since last message via ChannelMember
      const membership = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: channel.id, userId: recipientId },
        },
      });

      if (membership && membership.lastReadAt >= lastMessage.createdAt)
        continue;

      // Check user preferences
      const recipient = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          email: true,
          firstName: true,
          emailNotifications: true,
          isSuspended: true,
        },
      });

      if (!recipient || !recipient.emailNotifications || recipient.isSuspended)
        continue;

      const sender = await this.prisma.user.findUnique({
        where: { id: lastMessage.userId },
        select: { firstName: true, lastName: true },
      });

      try {
        await this.emailService.sendNotificationEmail(recipient.email, {
          firstName: recipient.firstName,
          title: `Unread message from ${sender?.firstName ?? 'Someone'}`,
          message: `You have an unread direct message from ${sender?.firstName ?? 'a colleague'} ${sender?.lastName ?? ''} that is waiting for your reply.`,
          actionUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/chat?channelId=${channel.id}`,
          actionText: 'Read Message',
        });
        reminded++;
      } catch {
        // Non-critical
      }
    }

    if (reminded > 0) {
      this.logger.log(`Sent ${reminded} unread DM reminder emails`);
    }
  }

  /**
   * Alert staff about fellows with consistently low resource engagement.
   * Runs daily at 11:00 UTC.
   */
  @Cron('0 11 * * *')
  async alertStaffLowEngagement() {
    // Find fellows whose last 5 completed resources all had engagement quality < 0.3
    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true },
    });

    let alerted = 0;
    for (const cohort of activeCohorts) {
      const fellows = await this.prisma.user.findMany({
        where: { cohortId: cohort.id, role: 'FELLOW', isSuspended: false },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const fellow of fellows) {
        const recentProgress = await this.prisma.resourceProgress.findMany({
          where: { userId: fellow.id, state: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: { engagementQuality: true },
        });

        if (recentProgress.length < 5) continue;

        const allLowQuality = recentProgress.every(
          (p) => (p.engagementQuality ?? 1) < 0.3,
        );

        if (allLowQuality) {
          try {
            const avgQuality =
              recentProgress.reduce(
                (sum, p) => sum + (p.engagementQuality ?? 0),
                0,
              ) / recentProgress.length;

            await this.notificationsService.notifyFellowLowEngagement(
              fellow.id,
              `${fellow.firstName} ${fellow.lastName}`,
              cohort.id,
              `Last 5 resources averaged ${Math.round(avgQuality * 100)}% engagement quality.`,
            );
            alerted++;
          } catch {
            // Non-critical
          }
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(
        `Alerted staff about ${alerted} fellows with low engagement`,
      );
    }
  }

  /**
   * Permanently remove discussions that have been archived longer than the retention window.
   * Runs daily at 03:15 UTC.
   */
  @Cron('15 3 * * *')
  async purgeLongArchivedDiscussions() {
    const days = DiscussionsService.ARCHIVED_DISCUSSION_RETENTION_DAYS;
    const threshold = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.discussion.deleteMany({
      where: {
        archivedAt: { not: null, lt: threshold },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Purged ${result.count} discussion(s) archived more than ${days} days ago`,
      );
    }
  }
}
