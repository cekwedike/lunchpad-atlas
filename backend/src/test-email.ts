import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EmailService } from './email/email.service';

/**
 * Test script to verify email configuration
 * Run with: npm run start:dev
 * Then in another terminal: node dist/test-email.js
 */
async function testEmail() {
  console.log('🧪 Testing Email Service...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Test 1: Send Welcome Email
    console.log('📧 Test 1: Sending welcome email...');
    const welcomeResult = await emailService.sendWelcomeEmail(
      'test@example.com', // Replace with your email
      {
        firstName: 'Test',
        lastName: 'User',
        cohortName: 'April 2026 Cohort A',
        startDate: new Date('2026-04-01'),
      }
    );
    console.log(welcomeResult ? '✅ Welcome email sent successfully!' : '❌ Failed to send welcome email');

    // Test 2: Send Notification Email
    console.log('\n📧 Test 2: Sending notification email...');
    const notificationResult = await emailService.sendNotificationEmail(
      'test@example.com', // Replace with your email
      {
        firstName: 'Test',
        title: 'Test Notification',
        message: 'This is a test notification from the ATLAS platform.',
        actionUrl: 'http://localhost:5173',
        actionText: 'Go to Dashboard',
      }
    );
    console.log(notificationResult ? '✅ Notification email sent successfully!' : '❌ Failed to send notification email');

    // Test 3: Send Weekly Summary
    console.log('\n📧 Test 3: Sending weekly summary email...');
    const summaryResult = await emailService.sendWeeklySummaryEmail(
      'test@example.com', // Replace with your email
      {
        firstName: 'Test',
        weekNumber: 4,
        resourcesCompleted: 8,
        pointsEarned: 850,
        rank: 5,
        totalParticipants: 30,
        upcomingSession: {
          title: 'Week 5: Networking Strategies',
          date: new Date('2026-04-29'),
        },
      }
    );
    console.log(summaryResult ? '✅ Weekly summary email sent successfully!' : '❌ Failed to send weekly summary email');

    console.log('\n🎉 Email testing complete!');
    console.log('\nℹ️  Check your inbox for the test emails.');
    console.log('📝 Remember to configure your SMTP credentials in .env file:');
    console.log('   - EMAIL_HOST');
    console.log('   - EMAIL_PORT');
    console.log('   - EMAIL_USER');
    console.log('   - EMAIL_PASSWORD');
    console.log('   - EMAIL_FROM\n');

  } catch (error) {
    console.error('\n❌ Error testing emails:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your .env file has correct SMTP settings');
    console.error('   2. For Gmail, use an App Password (not your regular password)');
    console.error('   3. Ensure 2FA is enabled on your Google account');
    console.error('   4. Verify EMAIL_HOST and EMAIL_PORT are correct\n');
  } finally {
    await app.close();
  }
}

testEmail();
