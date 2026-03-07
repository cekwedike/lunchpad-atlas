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
  password: string;
  role: string;
}

export interface NotificationEmailData {
  firstName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
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
    const enabled = this.configService.get<string>('EMAIL_NOTIFICATIONS_ENABLED');
    if (enabled !== 'true') {
      console.log('[EmailService] Email notifications disabled (EMAIL_NOTIFICATIONS_ENABLED != "true")');
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
      console.warn('[EmailService] No BREVO_API_KEY, RESEND_API_KEY, or EMAIL_USER/PASSWORD — emails will not be sent');
    } else {
      console.log(`[EmailService] Initialized with SMTP user=${user}, host=${this.configService.get('EMAIL_HOST', 'smtp.gmail.com')}`);
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
    const enabled = this.configService.get<string>('EMAIL_NOTIFICATIONS_ENABLED');
    if (enabled !== 'true') {
      console.log(`[EmailService] Skipping email to ${options.to} — notifications disabled`);
      return false;
    }

    const from = options.from ?? this.configService.get('EMAIL_FROM') ?? 'ATLAS Platform <onboarding@resend.dev>';
    const toArray = Array.isArray(options.to) ? options.to : [options.to];

    try {
      if (this.brevoApiKey) {
        // Brevo HTTP API
        const sender = this.parseFrom(from);
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
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
          console.warn(`[EmailService] Cannot send email to ${options.to} — no email provider configured`);
          return false;
        }
        await this.transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
      }

      console.log(`[EmailService] Sent "${options.subject}" to ${options.to}`);
      return true;
    } catch (error: any) {
      console.error(`[EmailService] Failed to send "${options.subject}" to ${options.to}:`, error?.message ?? error);
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
  ): Promise<boolean> {
    return this.sendNotificationEmail(email, {
      firstName,
      title: 'New Resource Available',
      message: `A new resource "${resourceTitle}" has been unlocked in ${sessionTitle}. Get started now to earn points!`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/resources`,
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
      title: '🏆 Achievement Unlocked!',
      message: `Congratulations! You've unlocked the "${achievementName}" achievement: ${achievementDescription}`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/achievements`,
      actionText: 'View Achievements',
    });
  }

  /**
   * Welcome Email Template
   */
  private getWelcomeTemplate(data: WelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ATLAS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #667eea;
      margin-top: 0;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to LaunchPad ATLAS</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Your Career Transformation Journey Begins!</p>
    </div>
    <div class="content">
      <h2>Hello ${data.firstName}!</h2>
      <p>We're thrilled to have you join the ${data.cohortName}! You're about to embark on an exciting 16-week journey designed to accelerate your career growth.</p>
      
      <div class="info-box">
        <strong>📅 Program Start:</strong> ${new Date(data.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <h3>What to Expect:</h3>
      <ul>
        <li><strong>Curated Resources:</strong> Videos, articles, and exercises tailored to your growth</li>
        <li><strong>Interactive Sessions:</strong> Weekly live sessions with industry experts</li>
        <li><strong>Gamified Learning:</strong> Earn points, unlock achievements, and compete on the leaderboard</li>
        <li><strong>Peer Discussions:</strong> Engage with fellow participants in meaningful conversations</li>
        <li><strong>AI-Powered Insights:</strong> Get personalized recommendations and analytics</li>
      </ul>

      <p><strong>Your next steps:</strong></p>
      <ol>
        <li>Complete your profile setup</li>
        <li>Explore the first week's resources</li>
        <li>Introduce yourself in the cohort chat</li>
        <li>Mark your calendar for the first live session</li>
      </ol>

      <center>
        <a href="${this.configService.get('FRONTEND_URL')}/dashboard" class="button">Get Started</a>
      </center>

      <p>If you have any questions, don't hesitate to reach out to your facilitator or our support team.</p>

      <p>Let's make this journey exceptional!</p>

      <p><strong>The LaunchPad ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LaunchPad ATLAS. All rights reserved.</p>
      <p><a href="${this.configService.get('FRONTEND_URL')}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Account Created Email Template (admin-initiated user creation)
   */
  private getAccountCreatedTemplate(data: AccountCreatedEmailData): string {
    const roleLabel = data.role === 'FACILITATOR' ? 'Facilitator' : 'Fellow';
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ATLAS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: bold;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 15px;
      opacity: 0.85;
    }
    .content {
      padding: 36px 30px;
    }
    .content p {
      margin: 0 0 16px 0;
    }
    .credentials-box {
      background: #f0f4ff;
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      padding: 20px 24px;
      margin: 24px 0;
    }
    .credentials-box h3 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4338ca;
    }
    .credential-row {
      display: flex;
      margin-bottom: 10px;
    }
    .credential-label {
      font-weight: 600;
      color: #374151;
      min-width: 90px;
      font-size: 14px;
    }
    .credential-value {
      color: #111827;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 2px 8px;
      word-break: break-all;
    }
    .warning-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
    .button-wrap {
      text-align: center;
      margin: 28px 0 8px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 40px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.35);
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LaunchPad ATLAS</h1>
      <p>Your ${roleLabel} account has been created</p>
    </div>
    <div class="content">
      <p>Hi ${data.firstName},</p>
      <p>Welcome to the LaunchPad ATLAS platform. An administrator has created an account for you as a <strong>${roleLabel}</strong>. Use the credentials below to log in and get started.</p>

      <div class="credentials-box">
        <h3>Your Login Details</h3>
        <div class="credential-row">
          <span class="credential-label">Email</span>
          <span class="credential-value">${data.email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password</span>
          <span class="credential-value">${data.password}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Login URL</span>
          <span class="credential-value">${loginUrl}</span>
        </div>
      </div>

      <div class="warning-box">
        For security, please change your password immediately after your first login.
      </div>

      <div class="button-wrap">
        <a href="${loginUrl}" class="button">Log In to LaunchPad ATLAS</a>
      </div>

      <p>If you have any questions, please reach out to your administrator.</p>
      <p><strong>The LaunchPad ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LaunchPad ATLAS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Notification Email Template
   */
  private getNotificationTemplate(data: NotificationEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: #667eea;
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 40px 30px;
    }
    .message-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <div class="message-box">
        ${data.message}
      </div>

      ${
        data.actionUrl
          ? `
      <center>
        <a href="${data.actionUrl}" class="button">${data.actionText || 'View Now'}</a>
      </center>
      `
          : ''
      }

      <p>Keep up the great work!</p>
      <p><strong>The LaunchPad ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LaunchPad ATLAS. All rights reserved.</p>
      <p><a href="${this.configService.get('FRONTEND_URL')}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Weekly Summary Email Template
   */
  private getWeeklySummaryTemplate(data: WeeklySummaryData): string {
    const percentile = Math.round(
      (1 - (data.rank - 1) / data.totalParticipants) * 100,
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Week ${data.weekNumber} Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 40px 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 30px 0;
    }
    .stat-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
    }
    .stat-label {
      font-size: 14px;
      color: #6c757d;
      text-transform: uppercase;
    }
    .rank-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Week ${data.weekNumber} Summary</h1>
      <p style="margin: 10px 0 0 0;">Your progress at a glance</p>
    </div>
    <div class="content">
      <h2>Hi ${data.firstName}!</h2>
      <p>Here's how you performed this week:</p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Resources Completed</div>
          <div class="stat-value">${data.resourcesCompleted}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Points Earned</div>
          <div class="stat-value">${data.pointsEarned}</div>
        </div>
      </div>

      <div class="rank-box">
        <h2 style="margin: 0 0 10px 0; font-size: 24px;">🏆 Leaderboard Rank</h2>
        <div style="font-size: 48px; font-weight: bold;">#${data.rank}</div>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Top ${percentile}% of ${data.totalParticipants} participants</p>
      </div>

      ${
        data.upcomingSession
          ? `
      <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
        <strong>📅 Upcoming Session:</strong> ${data.upcomingSession.title}<br>
        <span style="color: #6c757d;">${new Date(data.upcomingSession.date).toLocaleString()}</span>
      </div>
      `
          : ''
      }

      <center>
        <a href="${this.configService.get('FRONTEND_URL')}/leaderboard" class="button">View Full Leaderboard</a>
      </center>

      <p>Keep pushing forward! Every resource completed and every discussion posted brings you closer to your goals.</p>

      <p><strong>The LaunchPad ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LaunchPad ATLAS. All rights reserved.</p>
      <p><a href="${this.configService.get('FRONTEND_URL')}/email-preferences" style="color: #667eea;">Email Preferences</a> | <a href="${this.configService.get('FRONTEND_URL')}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
