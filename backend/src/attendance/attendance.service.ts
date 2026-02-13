import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as QRCode from 'qrcode';

interface CheckInData {
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  userAgent?: string;
}

interface AttendanceReport {
  sessionId: string;
  sessionTitle: string;
  scheduledDate: Date;
  totalFellows: number;
  attendedCount: number;
  attendanceRate: number;
  lateCount: number;
  excusedCount: number;
  attendees: Array<{
    userId: string;
    userName: string;
    email: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    isLate: boolean;
    isExcused: boolean;
    duration: number | null; // Minutes
  }>;
  absentees: Array<{
    userId: string;
    userName: string;
    email: string;
  }>;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate QR code for session check-in
   */
  async generateSessionQRCode(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Generate check-in URL (would point to your frontend check-in page)
    const checkInUrl = `${process.env.FRONTEND_URL}/attendance/check-in/${sessionId}`;

    // Generate QR code as data URL
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
      });

      return qrCodeDataUrl;
    } catch (error) {
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Check in user for session
   */
  async checkIn(userId: string, sessionId: string, data: CheckInData = {}) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        cohort: {
          include: {
            fellows: {
              where: { id: userId },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Verify user belongs to cohort
    if (session.cohort.fellows.length === 0) {
      throw new BadRequestException('User is not part of this cohort');
    }

    // Check if already checked in
    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User already checked in for this session');
    }

    // Determine if late (checked in after scheduled time)
    const now = new Date();
    const isLate = now > session.scheduledDate;

    // Create attendance record
    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        sessionId,
        checkInTime: now,
        latitude: data.latitude,
        longitude: data.longitude,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        isLate,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            sessionNumber: true,
            scheduledDate: true,
          },
        },
      },
    });

    // Award 20 points for attending (10 if late)
    const attendPoints = isLate ? 10 : 20;
    await this.prisma.pointsLog.create({
      data: {
        userId,
        points: attendPoints,
        eventType: 'SESSION_ATTEND',
        description: `Attended session: ${attendance.session.title}${isLate ? ' (late)' : ''}`,
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentMonthPoints: { increment: attendPoints } },
    });

    return attendance;
  }

  /**
   * Check out user from session
   */
  async checkOut(userId: string, sessionId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('User already checked out');
    }

    return this.prisma.attendance.update({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
      data: {
        checkOutTime: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get user's attendance record for session
   */
  async getUserAttendance(userId: string, sessionId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
      include: {
        session: {
          select: {
            title: true,
            sessionNumber: true,
            scheduledDate: true,
          },
        },
      },
    });

    if (!attendance) {
      return null;
    }

    // Calculate duration if checked out
    let duration: number | null = null;
    if (attendance.checkOutTime) {
      duration = Math.round(
        (attendance.checkOutTime.getTime() - attendance.checkInTime.getTime()) /
          60000,
      );
    }

    return {
      ...attendance,
      duration,
    };
  }

  /**
   * Get user's attendance history
   */
  async getUserAttendanceHistory(userId: string, cohortId?: string) {
    const where: any = { userId };

    if (cohortId) {
      where.session = {
        cohortId,
      };
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            title: true,
            sessionNumber: true,
            scheduledDate: true,
            cohort: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkInTime: 'desc',
      },
    });

    return attendanceRecords.map((record) => {
      let duration: number | null = null;
      if (record.checkOutTime) {
        duration = Math.round(
          (record.checkOutTime.getTime() - record.checkInTime.getTime()) /
            60000,
        );
      }

      return {
        ...record,
        duration,
      };
    });
  }

  /**
   * Generate comprehensive attendance report for session
   */
  async generateSessionReport(sessionId: string): Promise<AttendanceReport> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        cohort: {
          include: {
            fellows: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        attendance: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const totalFellows = session.cohort.fellows.length;
    const attendedCount = session.attendance.length;
    const attendanceRate =
      totalFellows > 0 ? (attendedCount / totalFellows) * 100 : 0;

    // Calculate late and excused counts
    const lateCount = session.attendance.filter((a) => a.isLate).length;
    const excusedCount = session.attendance.filter((a) => a.isExcused).length;

    // Map attendees
    const attendees = session.attendance.map((record) => {
      let duration: number | null = null;
      if (record.checkOutTime) {
        duration = Math.round(
          (record.checkOutTime.getTime() - record.checkInTime.getTime()) /
            60000,
        );
      }

      return {
        userId: record.user.id,
        userName: `${record.user.firstName} ${record.user.lastName}`,
        email: record.user.email,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        isLate: record.isLate,
        isExcused: record.isExcused,
        duration,
      };
    });

    // Find absentees
    const attendeeIds = new Set(session.attendance.map((a) => a.userId));
    const absentees = session.cohort.fellows
      .filter((fellow) => !attendeeIds.has(fellow.id))
      .map((fellow) => ({
        userId: fellow.id,
        userName: `${fellow.firstName} ${fellow.lastName}`,
        email: fellow.email,
      }));

    return {
      sessionId: session.id,
      sessionTitle: session.title,
      scheduledDate: session.scheduledDate,
      totalFellows,
      attendedCount,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      lateCount,
      excusedCount,
      attendees,
      absentees,
    };
  }

  /**
   * Get cohort attendance statistics
   */
  async getCohortAttendanceStats(cohortId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        fellows: {
          select: { id: true },
        },
        sessions: {
          include: {
            attendance: {
              select: {
                userId: true,
                isLate: true,
                checkInTime: true,
              },
            },
          },
          orderBy: {
            sessionNumber: 'asc',
          },
        },
      },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
    }

    const totalFellows = cohort.fellows.length;
    const totalSessions = cohort.sessions.length;
    const totalPossibleAttendances = totalFellows * totalSessions;

    let totalAttendances = 0;
    let totalLateArrivals = 0;

    const sessionStats = cohort.sessions.map((session) => {
      const attended = session.attendance.length;
      const late = session.attendance.filter((a) => a.isLate).length;
      const attendanceRate =
        totalFellows > 0 ? (attended / totalFellows) * 100 : 0;

      totalAttendances += attended;
      totalLateArrivals += late;

      return {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        sessionTitle: session.title,
        scheduledDate: session.scheduledDate,
        attended,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        lateCount: late,
      };
    });

    const overallAttendanceRate =
      totalPossibleAttendances > 0
        ? (totalAttendances / totalPossibleAttendances) * 100
        : 0;

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      totalFellows,
      totalSessions,
      totalAttendances,
      totalPossibleAttendances,
      overallAttendanceRate: Math.round(overallAttendanceRate * 10) / 10,
      totalLateArrivals,
      sessionStats,
    };
  }

  /**
   * Mark attendance as excused (facilitator only)
   */
  async markExcused(sessionId: string, userId: string, notes?: string) {
    // Check if attendance record exists
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });

    if (attendance) {
      // Update existing record
      return this.prisma.attendance.update({
        where: {
          userId_sessionId: {
            userId,
            sessionId,
          },
        },
        data: {
          isExcused: true,
          notes,
        },
      });
    } else {
      // Create excused absence record
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session with ID ${sessionId} not found`);
      }

      return this.prisma.attendance.create({
        data: {
          userId,
          sessionId,
          checkInTime: session.scheduledDate,
          isExcused: true,
          notes,
        },
      });
    }
  }

  /**
   * Validate geolocation (optional - for physical session enforcement)
   */
  validateGeolocation(
    userLat: number,
    userLng: number,
    sessionLat: number,
    sessionLng: number,
    radiusMeters: number = 100,
  ): boolean {
    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (userLat * Math.PI) / 180;
    const φ2 = (sessionLat * Math.PI) / 180;
    const Δφ = ((sessionLat - userLat) * Math.PI) / 180;
    const Δλ = ((sessionLng - userLng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters

    return distance <= radiusMeters;
  }
}
