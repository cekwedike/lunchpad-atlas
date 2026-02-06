# Quick Start Guide - ATLAS Platform

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

The npm install is currently running in the background. Once complete, you should see all packages installed including:
- nodemailer (email sending)
- qrcode (attendance QR codes)
- All other dependencies

### 2. Configure Email (IMPORTANT)

#### Option A: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication**:
   - Go to: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update .env file**:
   ```env
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT="587"
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # Paste app password here
   EMAIL_FROM="ATLAS Platform <noreply@atlas.com>"
   ```

#### Option B: Other Email Providers

**SendGrid**:
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASSWORD="your-sendgrid-api-key"
```

**Mailgun**:
```env
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT="587"
EMAIL_USER="postmaster@your-domain.mailgun.org"
EMAIL_PASSWORD="your-mailgun-password"
```

### 3. Database Setup

```bash
cd backend

# Ensure PostgreSQL is running
# Then push the schema (already done, but if needed):
npx prisma db push

# Seed the database with sample data
npx prisma db seed
```

### 4. Start the Application

**Terminal 1 - Backend**:
```bash
cd backend
npm run start:dev
```
Server will run on: http://localhost:4000

**Terminal 2 - Frontend**:
```bash
cd client
npm run dev
```
Frontend will run on: http://localhost:5173

### 5. Test Email Functionality

After starting the backend, test emails:

```bash
cd backend

# Build the project first
npm run build

# Run the email test script
node dist/test-email.js
```

This will send 3 test emails:
1. Welcome email
2. Notification email
3. Weekly summary email

**Note**: Update the email address in `backend/src/test-email.ts` before running!

---

## 📋 Feature Testing Checklist

### Email Integration (Feature #16)
- [ ] Configure SMTP credentials in .env
- [ ] Run test-email.ts script
- [ ] Check inbox for 3 test emails
- [ ] Verify HTML templates render correctly
- [ ] Test unsubscribe links work

### Attendance Tracking (Feature #15)
- [ ] Login as facilitator/admin
- [ ] Navigate to a session
- [ ] Click "Generate QR Code"
- [ ] Verify QR code displays
- [ ] Login as fellow in another browser
- [ ] Check in to session (allow geolocation)
- [ ] Verify late badge if after scheduled time
- [ ] Check out from session
- [ ] View attendance report as facilitator
- [ ] Export attendance to CSV
- [ ] Mark an absence as excused

### Live Quizzes (Feature #10)
- [ ] Login as facilitator
- [ ] Create a new live quiz
- [ ] Add 5 questions with 4 options each
- [ ] Start the quiz
- [ ] Join as participant in another browser
- [ ] Answer questions within time limit
- [ ] Verify real-time leaderboard updates
- [ ] Check final rankings display

### Chat System (Feature #1)
- [ ] Login as fellow
- [ ] Open chat sidebar
- [ ] Select a channel
- [ ] Send a message
- [ ] Verify real-time message appears
- [ ] Check typing indicator works
- [ ] Test in multiple browsers simultaneously

### Notifications (Feature #2)
- [ ] Check notification bell icon
- [ ] Verify unread count badge
- [ ] Click to view notifications
- [ ] Mark notification as read
- [ ] Delete a notification
- [ ] Verify real-time updates

---

## 🔧 Troubleshooting

### npm install fails
```bash
# Clear cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Email not sending
1. Check SMTP credentials in .env
2. For Gmail, use App Password (not regular password)
3. Verify 2FA is enabled
4. Check firewall/antivirus isn't blocking port 587

### Database connection error
```bash
# Check PostgreSQL is running
sudo service postgresql status  # Linux
brew services list  # macOS

# Verify DATABASE_URL in .env
psql -U postgres -d atlas  # Test connection
```

### Port already in use
```bash
# Kill process on port 4000
netstat -ano | findstr :4000  # Windows
lsof -ti:4000 | xargs kill  # Mac/Linux
```

---

## 📊 Sample Test Data

After running `npx prisma db seed`, you'll have:

**Users**:
- Admin: admin@atlas.com / Admin123!
- Facilitator: facilitator@atlas.com / Faci123!
- Fellow: fellow@atlas.com / Fellow123!

**Cohort**:
- April 2026 Cohort A (16 sessions)

**Sample Resources**:
- Videos, articles, exercises for each session

---

## 🎯 Next Steps

1. **Complete email configuration** - Most important!
2. **Test all features** - Use the checklist above
3. **Customize email templates** - Edit HTML in email.service.ts
4. **Set up production SMTP** - Use SendGrid/AWS SES for production
5. **Deploy to production** - Follow deployment guide

---

## 📞 Need Help?

If you encounter issues:

1. Check the error logs in terminal
2. Verify all environment variables are set
3. Ensure database is running
4. Check the documentation:
   - [PROJECT_SETUP.md](./PROJECT_SETUP.md)
   - [FEATURES_15-16_SUMMARY.md](./FEATURES_15-16_SUMMARY.md)

---

## ✅ Installation Complete Checklist

- [ ] npm install completed successfully
- [ ] .env file configured with email settings
- [ ] Database pushed and seeded
- [ ] Backend running on port 4000
- [ ] Frontend running on port 5173
- [ ] Email test script executed successfully
- [ ] Received 3 test emails in inbox
- [ ] All features tested and working

**Once all checked, you're ready to go! 🚀**
