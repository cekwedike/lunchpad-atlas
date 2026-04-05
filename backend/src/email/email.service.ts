import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  cohortName: string;
  startDate: Date;
}

export interface AccountCreatedEmailData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface GuestFacilitatorWelcomeEmailData {
  firstName: string;
  email: string;
  password: string;
  cohortName: string;
  sessions: { id: string; title: string; scheduledDate: Date }[];
  daysUntilSession: number;
  guestAccessExpiresAt: Date;
  daysUntilLock: number;
}

export interface GuestAccessExpiryReminderEmailData {
  firstName: string;
  guestAccessExpiresAt: Date;
}

export interface NotificationEmailData {
  firstName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  footer?: string;
}

export interface WeeklySummaryData {
  firstName: string;
  weekNumber: number;
  resourcesCompleted: number;
  pointsEarned: number;
  rank: number;
  totalParticipants: number;
  upcomingSession?: {
    title: string;
    date: Date;
  };
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private resend: Resend | null = null;
  private brevoApiKey: string | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const enabled = this.configService.get<string>(
      'EMAIL_NOTIFICATIONS_ENABLED',
    );
    if (enabled !== 'true') {
      console.log(
        '[EmailService] Email notifications disabled (EMAIL_NOTIFICATIONS_ENABLED != "true")',
      );
    }

    // 1. Brevo HTTP API (works on Render — no SMTP port needed)
    const brevoKey = this.configService.get<string>('BREVO_API_KEY');
    if (brevoKey) {
      this.brevoApiKey = brevoKey;
      console.log('[EmailService] Initialized with Brevo HTTP API');
      return;
    }

    // 2. Resend HTTP API
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey) {
      this.resend = new Resend(resendKey);
      console.log('[EmailService] Initialized with Resend (HTTP API)');
      return;
    }

    // 3. SMTP fallback (likely blocked on Render)
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    if (!user || !pass) {
      console.warn(
        '[EmailService] No BREVO_API_KEY, RESEND_API_KEY, or EMAIL_USER/PASSWORD — emails will not be sent',
      );
    } else {
      console.log(
        `[EmailService] Initialized with SMTP user=${user}, host=${this.configService.get('EMAIL_HOST', 'smtp.gmail.com')}`,
      );
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: Number(this.configService.get('EMAIL_PORT', 587)),
      secure: false,
      auth: { user, pass },
    });
  }

  /** Parse "Display Name <email@example.com>" into { name, email } for Brevo */
  private parseFrom(from: string): { name: string; email: string } {
    const match = from.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: 'ATLAS Platform', email: from.trim() };
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const enabled = this.configService.get<string>(
      'EMAIL_NOTIFICATIONS_ENABLED',
    );
    if (enabled !== 'true') {
      console.log(
        `[EmailService] Skipping email to ${options.to} — notifications disabled`,
      );
      return false;
    }

    const from =
      options.from ??
      this.configService.get('EMAIL_FROM') ??
      'ATLAS Platform <onboarding@resend.dev>';
    const toArray = Array.isArray(options.to) ? options.to : [options.to];

    try {
      if (this.brevoApiKey) {
        // Brevo HTTP API
        const sender = this.parseFrom(from);
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': this.brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender,
            to: toArray.map((email) => ({ email })),
            subject: options.subject,
            htmlContent: options.html,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Brevo API ${res.status}: ${body}`);
        }
      } else if (this.resend) {
        // Resend HTTP API
        const { error } = await this.resend.emails.send({
          from,
          to: toArray,
          subject: options.subject,
          html: options.html,
        });
        if (error) throw new Error(error.message);
      } else {
        // SMTP fallback
        const user = this.configService.get<string>('EMAIL_USER');
        const pass = this.configService.get<string>('EMAIL_PASSWORD');
        if (!user || !pass) {
          console.warn(
            `[EmailService] Cannot send email to ${options.to} — no email provider configured`,
          );
          return false;
        }
        await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
      }

      console.log(`[EmailService] Sent "${options.subject}" to ${options.to}`);
      return true;
    } catch (error: any) {
      console.error(
        `[EmailService] Failed to send "${options.subject}" to ${options.to}:`,
        error?.message ?? error,
      );
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    email: string,
    data: WelcomeEmailData,
  ): Promise<boolean> {
    const html = this.getWelcomeTemplate(data);

    return this.sendEmail({
      to: email,
      subject: `Welcome to LaunchPad ATLAS - ${data.cohortName}`,
      html,
    });
  }

  /**
   * Send account-created email to a newly registered user (admin-initiated)
   */
  async sendAccountCreatedEmail(
    email: string,
    data: AccountCreatedEmailData,
  ): Promise<boolean> {
    const html = this.getAccountCreatedTemplate(data);
    const roleLabel = data.role === 'FACILITATOR' ? 'Facilitator' : 'Fellow';
    return this.sendEmail({
      to: email,
      subject: `Welcome to LaunchPad ATLAS - Your ${roleLabel} account is ready`,
      html,
    });
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    data: NotificationEmailData,
  ): Promise<boolean> {
    const html = this.getNotificationTemplate(data);

    return this.sendEmail({
      to: email,
      subject: data.title,
      html,
    });
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummaryEmail(
    email: string,
    data: WeeklySummaryData,
  ): Promise<boolean> {
    const html = this.getWeeklySummaryTemplate(data);

    return this.sendEmail({
      to: email,
      subject: `Your Week ${data.weekNumber} Summary - LaunchPad ATLAS`,
      html,
    });
  }

  /**
   * Send resource unlock notification
   */
  async sendResourceUnlockEmail(
    email: string,
    firstName: string,
    resourceTitle: string,
    sessionTitle: string,
    resourceId?: string,
  ): Promise<boolean> {
    const base = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const actionUrl = resourceId
      ? `${base}/resources/${resourceId}`
      : `${base}/resources`;
    return this.sendNotificationEmail(email, {
      firstName,
      title: 'New Resource Available',
      message: `A new resource "${resourceTitle}" has been unlocked in ${sessionTitle}. Get started now to earn points!`,
      actionUrl,
      actionText: 'View Resource',
    });
  }

  /**
   * Send quiz reminder
   */
  async sendQuizReminderEmail(
    email: string,
    firstName: string,
    quizTitle: string,
    dueDate: Date,
  ): Promise<boolean> {
    return this.sendNotificationEmail(email, {
      firstName,
      title: 'Quiz Reminder',
      message: `Don't forget to complete "${quizTitle}" by ${dueDate.toLocaleDateString()}. Complete it to maintain your streak!`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/quizzes`,
      actionText: 'Take Quiz',
    });
  }

  /**
   * Send session reminder
   */
  async sendSessionReminderEmail(
    email: string,
    firstName: string,
    sessionTitle: string,
    scheduledDate: Date,
  ): Promise<boolean> {
    return this.sendNotificationEmail(email, {
      firstName,
      title: 'Upcoming Session Reminder',
      message: `Your session "${sessionTitle}" is scheduled for ${scheduledDate.toLocaleString()}. Don't miss it!`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/sessions`,
      actionText: 'View Session',
    });
  }

  /**
   * Send achievement unlock notification
   */
  async sendAchievementEmail(
    email: string,
    firstName: string,
    achievementName: string,
    achievementDescription: string,
  ): Promise<boolean> {
    return this.sendNotificationEmail(email, {
      firstName,
      title: 'Achievement Unlocked',
      message: `Congratulations! You've unlocked the "${achievementName}" achievement: ${achievementDescription}`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/achievements`,
      actionText: 'View Achievements',
    });
  }

  /**
   * Send password reset email (admin-triggered)
   */
  async sendPasswordResetEmail(
    email: string,
    data: { firstName: string; temporaryPassword: string },
  ): Promise<boolean> {
    const html = this.getPasswordResetTemplate(data);
    return this.sendEmail({
      to: email,
      subject: 'Your ATLAS password has been reset',
      html,
    });
  }

  /**
   * Password Reset Email Template
   */
  private getPasswordResetTemplate(data: {
    firstName: string;
    temporaryPassword: string;
  }): string {
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ATLAS password has been reset</title>
  <style>
    body { margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
    .preheader { display:none;max-height:0;overflow:hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <span class="preheader">An administrator has reset your ATLAS password. Your temporary password is inside.</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.10);">

        <!-- TOP ACCENT BAR -->
        <tr><td style="background:#4338ca;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr><td style="background:#1e3a8a;padding:40px 48px 32px;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#93c5fd;margin-bottom:12px;">LaunchPad ATLAS</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Your password has been reset</div>
          <p style="margin:10px 0 0;font-size:14px;color:#94a3b8;">Use the temporary password below to log in.</p>
        </td></tr>

        <!-- GREETING -->
        <tr><td style="padding:40px 48px 0;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">Hi <strong style="color:#0f172a;">${data.firstName}</strong>,</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">An administrator has reset your password on LaunchPad ATLAS. Use the temporary password below to log in, then change it to something personal from your profile settings.</p>
        </td></tr>

        <!-- CREDENTIALS BOX -->
        <tr><td style="padding:24px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;margin-bottom:16px;">Temporary Password</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="90" valign="top" style="font-size:13px;font-weight:600;color:#374151;padding:5px 0;">Password</td>
                  <td valign="top" style="padding:5px 0;">
                    <span style="font-size:13px;font-family:'Courier New',monospace;background:#ffffff;border:1px solid #e5e7eb;border-radius:4px;padding:3px 10px;color:#111827;">${data.temporaryPassword}</span>
                  </td>
                </tr>
                <tr><td colspan="2" style="height:8px;"></td></tr>
                <tr>
                  <td width="90" valign="top" style="font-size:13px;font-weight:600;color:#374151;padding:5px 0;">Login URL</td>
                  <td valign="top" style="padding:5px 0;">
                    <a href="${loginUrl}" style="font-size:13px;color:#4338ca;word-break:break-all;">${loginUrl}</a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- SECURITY NOTE -->
        <tr><td style="padding:16px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
            <tr><td style="padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
              <strong>Security note:</strong> If you did not expect this reset, contact your programme administrator immediately. We recommend changing your password as soon as you log in.
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:32px 48px 44px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:15px 44px;background:#1e3a8a;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(30,58,138,0.35);">Log In to ATLAS</a>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Welcome Email Template
   */
  private getWelcomeTemplate(data: WelcomeEmailData): string {
    const startDateFormatted = new Date(data.startDate).toLocaleDateString(
      'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    );
    const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dashboard`;
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ATLAS</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
    a { color: inherit; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <span class="preheader">Welcome to ${data.cohortName} — your journey starts now.</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.10);">

        <!-- TOP ACCENT BAR -->
        <tr><td style="background:#0ea5e9;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr><td style="background:#0f172a;padding:44px 48px 36px;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0ea5e9;margin-bottom:14px;">LaunchPad Fellowship</div>
          <div style="font-size:38px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1;">ATLAS</div>
          <div style="margin-top:18px;width:48px;height:2px;background:#0ea5e9;margin-left:auto;margin-right:auto;"></div>
          <p style="margin:18px 0 0;font-size:17px;color:#94a3b8;line-height:1.5;">Your career transformation journey begins.</p>
        </td></tr>

        <!-- GREETING -->
        <tr><td style="padding:44px 48px 0;">
          <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Hello, ${data.firstName}.</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">
            We are delighted to welcome you to the <strong style="color:#0f172a;">${data.cohortName}</strong>. Over the coming weeks, ATLAS will be your companion for structured learning, meaningful growth, and measurable progress.
          </p>
        </td></tr>

        <!-- START DATE BOX -->
        <tr><td style="padding:24px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;">
            <tr><td style="padding:16px 20px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0284c7;margin-bottom:4px;">Program Start Date</div>
              <div style="font-size:15px;font-weight:600;color:#0f172a;">${startDateFormatted}</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- WHAT AWAITS -->
        <tr><td style="padding:32px 48px 0;">
          <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">What awaits you</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" valign="top" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">Curated Resources</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;">Videos, articles, and exercises designed around your growth track.</div>
              </td>
              <td width="4%"></td>
              <td width="48%" valign="top" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">Live Sessions</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;">Weekly interactive sessions with industry experts and your cohort.</div>
              </td>
            </tr>
            <tr><td colspan="3" style="height:12px;"></td></tr>
            <tr>
              <td width="48%" valign="top" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">Gamified Progress</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;">Earn points, unlock achievements, and rise on the leaderboard.</div>
              </td>
              <td width="4%"></td>
              <td width="48%" valign="top" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">Peer Community</div>
                <div style="font-size:13px;color:#64748b;line-height:1.6;">Discuss, collaborate, and grow alongside your fellow participants.</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- FIRST STEPS -->
        <tr><td style="padding:32px 48px 0;">
          <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">Your first steps</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top" width="32" style="padding:0 0 14px;">
                <span style="display:inline-block;width:24px;height:24px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">1</span>
              </td>
              <td valign="top" style="padding:0 0 14px 10px;font-size:14px;color:#334155;line-height:1.6;">
                <strong style="color:#0f172a;">Complete your profile</strong> — add your photo and update your details.
              </td>
            </tr>
            <tr>
              <td valign="top" width="32" style="padding:0 0 14px;">
                <span style="display:inline-block;width:24px;height:24px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">2</span>
              </td>
              <td valign="top" style="padding:0 0 14px 10px;font-size:14px;color:#334155;line-height:1.6;">
                <strong style="color:#0f172a;">Explore Week 1 resources</strong> — get ahead before the first session.
              </td>
            </tr>
            <tr>
              <td valign="top" width="32" style="padding:0 0 14px;">
                <span style="display:inline-block;width:24px;height:24px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">3</span>
              </td>
              <td valign="top" style="padding:0 0 14px 10px;font-size:14px;color:#334155;line-height:1.6;">
                <strong style="color:#0f172a;">Introduce yourself</strong> — say hello in the cohort chat.
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:32px 48px 44px;text-align:center;">
          <a href="${dashboardUrl}" style="display:inline-block;padding:15px 44px;background:#0ea5e9;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(14,165,233,0.35);">Access Your Dashboard</a>
          <p style="margin:28px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">Questions? Reach out to your facilitator or reply to this email.</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;letter-spacing:0.05em;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Account Created Email Template (admin-initiated user creation)
   */
  private getAccountCreatedTemplate(data: AccountCreatedEmailData): string {
    const isFacilitator = data.role === 'FACILITATOR';
    const roleLabel = isFacilitator ? 'Facilitator' : 'Fellow';
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
    const year = new Date().getFullYear();

    const accentColor = isFacilitator ? '#0ea5e9' : '#4338ca';
    const headerBg = isFacilitator ? '#1e293b' : '#1e3a8a';
    const btnBg = isFacilitator ? '#1e293b' : '#4338ca';
    const btnShadow = isFacilitator
      ? 'rgba(30,41,59,0.35)'
      : 'rgba(67,56,202,0.35)';
    const credBg = isFacilitator ? '#f0f9ff' : '#f5f3ff';
    const credBorder = isFacilitator ? '#bae6fd' : '#ddd6fe';
    const credLabelColor = isFacilitator ? '#0284c7' : '#7c3aed';

    const fellowSteps = `
      <tr>
        <td valign="top" width="32" style="padding:0 0 16px;">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">1</span>
        </td>
        <td valign="top" style="padding:0 0 16px 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Change your password</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Go to Profile &amp; Settings via the avatar menu and set a personal password.</div>
        </td>
      </tr>
      <tr>
        <td valign="top" width="32" style="padding:0 0 16px;">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">2</span>
        </td>
        <td valign="top" style="padding:0 0 16px 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Take the platform tour</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">A 2-minute walkthrough covers everything. Find it in the avatar menu.</div>
        </td>
      </tr>
      <tr>
        <td valign="top" width="32">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">3</span>
        </td>
        <td valign="top" style="padding:0 0 0 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Review notification preferences</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Customise how ATLAS notifies you about resources and sessions.</div>
        </td>
      </tr>`;

    const facilitatorSteps = `
      <tr>
        <td valign="top" width="32" style="padding:0 0 16px;">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">1</span>
        </td>
        <td valign="top" style="padding:0 0 16px 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Complete your profile</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Add your details and update your password via Profile &amp; Settings.</div>
        </td>
      </tr>
      <tr>
        <td valign="top" width="32" style="padding:0 0 16px;">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">2</span>
        </td>
        <td valign="top" style="padding:0 0 16px 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Review the session schedule</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Familiarise yourself with upcoming sessions and cohort details on the dashboard.</div>
        </td>
      </tr>
      <tr>
        <td valign="top" width="32">
          <span style="display:inline-block;width:24px;height:24px;background:${accentColor};border-radius:50%;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#fff;">3</span>
        </td>
        <td valign="top" style="padding:0 0 0 10px;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">Connect with your cohort</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px;">Check the fellow roster and reach out via the platform chat to introduce yourself.</div>
        </td>
      </tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ATLAS account is ready</title>
  <style>
    body { margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
    .preheader { display:none;max-height:0;overflow:hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <span class="preheader">Your ${roleLabel} account on LaunchPad ATLAS is ready — here are your login details.</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.10);">

        <!-- TOP ACCENT BAR -->
        <tr><td style="background:${accentColor};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr><td style="background:${headerBg};padding:40px 48px 32px;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accentColor};margin-bottom:12px;">LaunchPad ATLAS</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Your ${roleLabel} account is ready</div>
          <p style="margin:10px 0 0;font-size:14px;color:#94a3b8;">Sign in with your email and the temporary password your administrator shared with you securely.</p>
        </td></tr>

        <!-- GREETING -->
        <tr><td style="padding:40px 48px 0;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">Hi <strong style="color:#0f172a;">${data.firstName}</strong>,</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">An administrator has created a <strong>${roleLabel}</strong> account for you on the LaunchPad ATLAS platform. Use the email below to sign in; your temporary password was shared with you separately (not in this email).</p>
        </td></tr>

        <!-- CREDENTIALS BOX -->
        <tr><td style="padding:24px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${credBg};border:1px solid ${credBorder};border-radius:10px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${credLabelColor};margin-bottom:16px;">Login Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="90" valign="top" style="font-size:13px;font-weight:600;color:#374151;padding:5px 0;">Email</td>
                  <td valign="top" style="padding:5px 0;">
                    <span style="font-size:13px;font-family:'Courier New',monospace;background:#ffffff;border:1px solid #e5e7eb;border-radius:4px;padding:3px 10px;color:#111827;word-break:break-all;">${data.email}</span>
                  </td>
                </tr>
                <tr><td colspan="2" style="height:8px;"></td></tr>
                <tr>
                  <td width="90" valign="top" style="font-size:13px;font-weight:600;color:#374151;padding:5px 0;">Login URL</td>
                  <td valign="top" style="padding:5px 0;">
                    <a href="${loginUrl}" style="font-size:13px;color:${accentColor};word-break:break-all;">${loginUrl}</a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- SECURITY NOTE -->
        <tr><td style="padding:16px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
            <tr><td style="padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
              <strong>Security:</strong> Temporary passwords are never sent by email. Change your password after first sign-in. If you did not receive a password, contact your administrator.
            </td></tr>
          </table>
        </td></tr>

        <!-- FIRST STEPS -->
        <tr><td style="padding:28px 48px 0;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">After you log in</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${isFacilitator ? facilitatorSteps : fellowSteps}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:32px 48px 44px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:15px 44px;background:${btnBg};color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px ${btnShadow};">Log In to ATLAS</a>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Notification Email Template
   */
  private getNotificationTemplate(data: NotificationEmailData): string {
    const year = new Date().getFullYear();
    const unsubUrl = `${this.configService.get('FRONTEND_URL')}/unsubscribe`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body { margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
    .preheader { display:none;max-height:0;overflow:hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <span class="preheader">${data.title} — ${data.message.substring(0, 80)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

        <!-- TOP BAR -->
        <tr><td style="background:#1e3a8a;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- WORDMARK -->
        <tr><td style="padding:24px 48px 20px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:16px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px;">ATLAS</span>
          <span style="font-size:12px;color:#94a3b8;margin-left:8px;">LaunchPad Fellowship</span>
        </td></tr>

        <!-- TITLE + GREETING -->
        <tr><td style="padding:36px 48px 0;">
          <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">${data.title}</h1>
          <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">Hi <strong style="color:#0f172a;">${data.firstName}</strong>,</p>
        </td></tr>

        <!-- MESSAGE BOX -->
        <tr><td style="padding:16px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #0ea5e9;border-radius:0 8px 8px 0;">
            <tr><td style="padding:18px 20px;font-size:15px;color:#334155;line-height:1.7;">${data.message}</td></tr>
          </table>
        </td></tr>

        ${
          data.actionUrl
            ? `
        <!-- CTA -->
        <tr><td style="padding:28px 48px 0;text-align:center;">
          <a href="${data.actionUrl}" style="display:inline-block;padding:14px 40px;background:#1e3a8a;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,138,0.30);">${data.actionText ?? 'View Now'}</a>
        </td></tr>`
            : ''
        }

        <!-- CLOSING -->
        <tr><td style="padding:28px 48px 40px;">
          <p style="margin:0 0 4px;font-size:14px;color:#64748b;">${data.footer ?? 'Keep up the great work.'}</p>
          <p style="margin:0;font-size:14px;color:#64748b;">The <strong style="color:#0f172a;">ATLAS</strong> Team</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved. &nbsp;|&nbsp; <a href="${unsubUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * Weekly Summary Email Template
   */
  private getWeeklySummaryTemplate(data: WeeklySummaryData): string {
    const percentile = Math.round(
      (1 - (data.rank - 1) / data.totalParticipants) * 100,
    );
    const leaderboardUrl = `${this.configService.get('FRONTEND_URL')}/leaderboard`;
    const prefsUrl = `${this.configService.get('FRONTEND_URL')}/dashboard/settings`;
    const unsubUrl = `${this.configService.get('FRONTEND_URL')}/unsubscribe`;
    const year = new Date().getFullYear();

    const sessionBlock = data.upcomingSession
      ? `<tr><td style="padding:0 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;">
            <tr><td style="padding:16px 20px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0284c7;margin-bottom:6px;">Upcoming Session</div>
              <div style="font-size:15px;font-weight:600;color:#0f172a;">${data.upcomingSession.title}</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">${new Date(data.upcomingSession.date).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="height:24px;"></td></tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Week ${data.weekNumber} Progress Report</title>
  <style>
    body { margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
    .preheader { display:none;max-height:0;overflow:hidden; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <span class="preheader">Week ${data.weekNumber} — ${data.resourcesCompleted} resources completed, ${data.pointsEarned} points earned. Rank #${data.rank}.</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.10);">

        <!-- TOP ACCENT BAR -->
        <tr><td style="background:#1e3a8a;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr><td style="background:#1e3a8a;padding:40px 48px 32px;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#93c5fd;margin-bottom:10px;">Weekly Progress Report</div>
          <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-1px;">Week ${data.weekNumber}</div>
          <p style="margin:10px 0 0;font-size:14px;color:#93c5fd;">Here is how you performed, ${data.firstName}.</p>
        </td></tr>

        <!-- STATS ROW -->
        <tr><td style="padding:36px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Resources Completed</div>
                <div style="font-size:44px;font-weight:800;color:#0ea5e9;line-height:1.1;margin:10px 0 4px;">${data.resourcesCompleted}</div>
                <div style="font-size:12px;color:#94a3b8;">this week</div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Points Earned</div>
                <div style="font-size:44px;font-weight:800;color:#4338ca;line-height:1.1;margin:10px 0 4px;">${data.pointsEarned}</div>
                <div style="font-size:12px;color:#94a3b8;">this week</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- RANK BANNER -->
        <tr><td style="padding:24px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;">
            <tr><td style="padding:28px 32px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Leaderboard Rank</div>
              <div style="font-size:56px;font-weight:800;color:#ffffff;line-height:1;">#${data.rank}</div>
              <div style="font-size:13px;color:#94a3b8;margin-top:10px;">Top ${percentile}% of ${data.totalParticipants} participants</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- UPCOMING SESSION (conditional) -->
        <tr><td style="height:24px;"></td></tr>
        ${sessionBlock}

        <!-- CLOSING + CTA -->
        <tr><td style="padding:0 48px 0;">
          <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">Every resource completed and every discussion posted moves you closer to your goals. Keep the momentum going.</p>
        </td></tr>
        <tr><td style="padding:0 48px 40px;text-align:center;">
          <a href="${leaderboardUrl}" style="display:inline-block;padding:14px 44px;background:#1e3a8a;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,138,0.30);">View Full Leaderboard</a>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved. &nbsp;|&nbsp; <a href="${prefsUrl}" style="color:#94a3b8;text-decoration:underline;">Email Preferences</a> &nbsp;|&nbsp; <a href="${unsubUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  async sendGuestFacilitatorWelcomeEmail(
    to: string,
    data: GuestFacilitatorWelcomeEmailData,
  ): Promise<void> {
    const loginUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login`
      : 'https://launchpadatlas.vercel.app/login';
    const year = new Date().getFullYear();

    const sessionRows = data.sessions
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
      .map(
        (s) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;">${s.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;white-space:nowrap;">${s.scheduledDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>`,
      )
      .join('');

    const expiryFormatted = data.guestAccessExpiresAt.toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to ATLAS</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#0f2a6b 0%,#1e3a8a 60%,#3730a3 100%);padding:48px 48px 36px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">LaunchPad ATLAS</p>
          <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;">Welcome to ATLAS, ${data.firstName}</h1>
          <p style="margin:0;font-size:15px;color:#bfdbfe;line-height:1.6;">You have been invited as a Guest Facilitator</p>
        </td></tr>

        <!-- WHY YOU'RE HERE -->
        <tr><td style="padding:40px 48px 0;">
          <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">Why you have been invited</h2>
          <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">You have been invited as a Guest Facilitator for the <strong>${data.cohortName}</strong> cohort on the LaunchPad Fellowship ATLAS platform. We believe that fellows benefit greatly from interacting with experienced practitioners beyond formal sessions — your presence creates real-world connection and meaningful mentorship that extends the impact of each session.</p>
        </td></tr>

        <!-- YOUR SESSION(S) -->
        <tr><td style="padding:32px 48px 0;">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">Your assigned session${data.sessions.length > 1 ? 's' : ''}</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Session</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
            </tr>
            ${sessionRows}
          </table>
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Your first session is in <strong>${data.daysUntilSession} day${data.daysUntilSession !== 1 ? 's' : ''}</strong>.</p>
        </td></tr>

        <!-- WHAT YOU CAN ACCESS -->
        <tr><td style="padding:32px 48px 0;">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">What you can access on ATLAS</h2>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="50%" style="padding-right:8px;vertical-align:top;">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">You can access</p>
                  <ul style="margin:0;padding-left:16px;font-size:14px;color:#166534;line-height:1.9;">
                    <li>Resources for your assigned session${data.sessions.length > 1 ? 's' : ''}</li>
                    <li>Discussions with fellows</li>
                    <li>Cohort chat channels</li>
                  </ul>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;vertical-align:top;">
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Not available</p>
                  <ul style="margin:0;padding-left:16px;font-size:14px;color:#991b1b;line-height:1.9;">
                    <li>Admin or management tools</li>
                    <li>Other sessions' content</li>
                    <li>Attendance or points management</li>
                  </ul>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- ACCESS WINDOW -->
        <tr><td style="padding:32px 48px 0;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px 24px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Your access window</p>
            <p style="margin:0;font-size:15px;color:#78350f;line-height:1.6;">Your ATLAS account will remain active until <strong>${expiryFormatted}</strong> — <strong>${data.daysUntilLock} day${data.daysUntilLock !== 1 ? 's' : ''}</strong> from now. After this date it will be automatically locked. If you need extended access, contact your programme administrator.</p>
          </div>
        </td></tr>

        <!-- LOGIN CREDENTIALS -->
        <tr><td style="padding:32px 48px 0;">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">Your login credentials</h2>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:#64748b;padding-bottom:10px;width:120px;">Login URL</td>
                <td style="font-size:14px;padding-bottom:10px;"><a href="${loginUrl}" style="color:#1e3a8a;font-weight:600;">${loginUrl}</a></td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#64748b;padding-bottom:10px;">Email</td>
                <td style="font-size:14px;color:#0f172a;font-weight:600;padding-bottom:10px;">${data.email}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#64748b;">Password</td>
                <td style="font-size:14px;font-family:monospace;background:#e2e8f0;padding:4px 10px;border-radius:6px;color:#0f172a;font-weight:700;">${data.password}</td>
              </tr>
            </table>
          </div>
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">For security, you will be asked to change your password on first login.</p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:32px 48px 40px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:14px 44px;background:#1e3a8a;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,138,0.30);">Log In to ATLAS</a>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendEmail({
      to,
      subject: `Welcome to ATLAS — ${data.cohortName}`,
      html,
    });
  }

  async sendGuestAccessExpiryReminderEmail(
    to: string,
    data: GuestAccessExpiryReminderEmailData,
  ): Promise<void> {
    const loginUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login`
      : 'https://launchpadatlas.vercel.app/login';
    const year = new Date().getFullYear();

    const expiryFormatted = data.guestAccessExpiresAt.toLocaleDateString(
      'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ATLAS access expires tomorrow</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#92400e 0%,#b45309 100%);padding:48px 48px 36px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#fde68a;text-transform:uppercase;">LaunchPad ATLAS</p>
          <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#ffffff;">Your access expires tomorrow</h1>
          <p style="margin:0;font-size:15px;color:#fef3c7;line-height:1.6;">Guest Facilitator access reminder</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:40px 48px;">
          <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Hi <strong>${data.firstName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">This is a reminder that your guest facilitator access to ATLAS expires <strong>tomorrow, ${expiryFormatted}</strong>.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">After this date, your account will be automatically locked and you will no longer be able to log in. If you need continued access beyond tomorrow, please contact your programme administrator as soon as possible.</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
            <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">Your access expires on: <strong>${expiryFormatted}</strong></p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 48px 40px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:14px 44px;background:#1e3a8a;color:#ffffff!important;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(30,58,138,0.30);">Log In Now</a>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">ATLAS &mdash; LaunchPad Fellowship</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} LaunchPad. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendEmail({
      to,
      subject: 'Your ATLAS guest facilitator access expires tomorrow',
      html,
    });
  }
}
