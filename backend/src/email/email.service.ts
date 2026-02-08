import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
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

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = {
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const from =
        options.from ||
        this.configService.get(
          'EMAIL_FROM',
          'ATLAS Platform <noreply@atlas.com>',
        );

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
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
      subject: `Welcome to ATLAS - ${data.cohortName}`,
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
      subject: `Your Week ${data.weekNumber} Summary - ATLAS`,
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
      <h1>🚀 Welcome to ATLAS</h1>
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

      <p><strong>The ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ATLAS Platform. All rights reserved.</p>
      <p><a href="${this.configService.get('FRONTEND_URL')}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
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
      <p><strong>The ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ATLAS Platform. All rights reserved.</p>
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

      <p><strong>The ATLAS Team</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ATLAS Platform. All rights reserved.</p>
      <p><a href="${this.configService.get('FRONTEND_URL')}/email-preferences" style="color: #667eea;">Email Preferences</a> | <a href="${this.configService.get('FRONTEND_URL')}/unsubscribe" style="color: #667eea;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
