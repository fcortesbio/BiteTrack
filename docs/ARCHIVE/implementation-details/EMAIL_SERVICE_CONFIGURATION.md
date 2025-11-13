# Email Service Configuration Guide

## Overview

BiteTrack uses Nodemailer for email delivery with support for:
- **Development**: Ethereal Email (free test service)
- **Production**: SendGrid, AWS SES, or any SMTP-compatible service

---

## Quick Setup

### Development (Automatic)
No configuration needed! The email service automatically:
1. Creates a test Ethereal account on first run
2. Logs credentials to console
3. Provides preview URLs for viewing emails

### Production
Set these environment variables in `.env.production`:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

---

## Configuration Options

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SMTP_HOST` | Email server hostname | smtp.sendgrid.net |
| `SMTP_PORT` | Email server port | 587 (TLS) or 465 (SSL) |
| `EMAIL_USER` | SMTP username | apikey (for SendGrid) |
| `EMAIL_PASSWORD` | SMTP password/token | sg.xxxx... |
| `EMAIL_FROM` | Sender email address | noreply@yourdomain.com |
| `CLIENT_URL` | Frontend base URL | https://app.yourdomain.com |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | development |

---

## Setup Instructions by Provider

### 1. Development (Ethereal Email)

**Setup Time:** ~5 minutes
**Cost:** Free
**Best For:** Local development & testing

#### Quick Start
```bash
# Just run the server
npm run dev
```

The server will automatically:
1. Generate Ethereal test credentials
2. Log them to console
3. Create test accounts on demand

#### Console Output
```
=== USING TEST EMAIL ACCOUNT ===
Username: test.account@ethereal.email
Password: ethereal_password
URL: smtp.ethereal.email:587
Preview URL: https://ethereal.email/message/WjYjEu...
```

#### View Test Emails
```bash
# Click the preview URL from console output
# Or visit: https://ethereal.email
```

---

### 2. SendGrid (Recommended for Production)

**Setup Time:** ~10 minutes
**Cost:** Free tier available (100 emails/day)
**Best For:** Production deployments

#### Step 1: Create SendGrid Account
1. Go to [sendgrid.com/pricing](https://sendgrid.com/pricing)
2. Sign up for free account
3. Verify email address

#### Step 2: Generate API Key
1. Login to SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `BiteTrack-Production`
5. Select **Full Access**
6. Copy the generated key (starts with `SG.`)

#### Step 3: Update `.env.production`
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

#### Step 4: Verify Sender Email
1. In SendGrid dashboard, go to **Settings** → **Sender Authentication**
2. Add your domain or verify single sender email
3. Follow verification steps

#### Troubleshooting SendGrid
```bash
# Test SendGrid connection
curl --url 'smtp://smtp.sendgrid.net:587' \
  --user 'apikey:SG_YOUR_API_KEY' \
  --upload-file /dev/null \
  --verbose
```

---

### 3. AWS SES

**Setup Time:** ~15 minutes
**Cost:** Pay-as-you-go
**Best For:** AWS-hosted deployments

#### Step 1: Configure AWS SES
1. Open AWS SES console
2. Go to **Verified identities**
3. Click **Create identity**
4. Verify your domain or email
5. Request production access (if needed)

#### Step 2: Generate SMTP Credentials
1. Navigate to **Account dashboard**
2. Go to **SMTP settings**
3. Click **Create My SMTP credentials**
4. Copy username and password

#### Step 3: Update `.env.production`
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

---

### 4. Gmail (Not Recommended for Production)

**Setup Time:** ~5 minutes
**Limitation:** Limited sending rate
**Best For:** Testing only

#### Step 1: Generate App Password
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Enable 2-Factor Authentication
3. Go to **App passwords**
4. Select Mail → Windows Computer
5. Copy the 16-character password

#### Step 2: Update Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=your-email@gmail.com
CLIENT_URL=https://yourdomain.com
```

**Note:** Gmail limits sending to ~100 emails per hour. Not suitable for production.

---

### 5. Custom SMTP Server

#### General Setup
```env
SMTP_HOST=mail.yourserver.com
SMTP_PORT=587 # or 465 for SSL
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

**Test Connection:**
```bash
telnet mail.yourserver.com 587
```

---

## Security Best Practices

### 1. Use Environment Variables
**Never** hardcode credentials in code:
```javascript
// BAD
const transporter = nodemailer.createTransport({
  user: 'apikey:SG_XXXXX'
});

// GOOD
const transporter = nodemailer.createTransport({
  user: process.env.EMAIL_USER
});
```

### 2. Protect `.env` Files
```bash
# Add to .gitignore
echo ".env.production" >> .gitignore
```

### 3. Use API Keys Over Passwords
- SendGrid: Use API keys (not user password)
- AWS SES: Use IAM credentials
- Gmail: Use app-specific passwords

### 4. Rotate Credentials Regularly
- Monthly: SendGrid API keys
- Quarterly: AWS SES credentials
- Every 6 months: Custom SMTP passwords

### 5. Monitor Email Delivery
- SendGrid: Dashboard analytics
- AWS SES: CloudWatch metrics
- Custom: Check server logs

---

## Testing Email Configuration

### Manual Test
```bash
# Start development server
npm run dev

# In another terminal, request password recovery
curl -X POST http://localhost:3000/bitetrack/auth/request-recovery \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "dateOfBirth": "1990-01-01"
  }'
```

### Run Email Tests
```bash
# All tests (including email)
npm test

# Specific integration tests
npm test -- tests/integration/auth-real.test.js
```

### Verify Email Receipt
- **Ethereal**: Check console output for preview URL
- **SendGrid**: Login to dashboard, check "Activity"
- **AWS SES**: Check CloudWatch logs
- **Gmail**: Check sent folder

---

## Troubleshooting

### Issue: "Email service not configured"

**Cause:** Missing `EMAIL_USER` or `EMAIL_PASSWORD`

**Fix:**
```bash
# Check if variables are set
echo $EMAIL_USER
echo $EMAIL_PASSWORD

# Add to .env.production if missing
nano .env.production
```

### Issue: "Failed to send email"

**Common Causes:**
1. **Invalid SMTP credentials**
   ```bash
   # Test connection
   telnet smtp.sendgrid.net 587
   ```

2. **Port blocked by firewall**
   ```bash
   # Try port 465 instead of 587
   SMTP_PORT=465
   ```

3. **TLS/SSL mismatch**
   - Port 587 = TLS (not secure)
   - Port 465 = SSL (secure)

4. **Rate limit exceeded**
   - Check with email provider for limits
   - Implement retry logic

### Issue: Emails not received

**Check:**
1. Sender email is verified with provider
2. Email not in spam folder
3. Email address is correct
4. Check email provider logs

---

## Configuration by Environment

### Development
```env
# .secrets (or .env.development)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
EMAIL_USER=auto-generated
EMAIL_PASSWORD=auto-generated
EMAIL_FROM=noreply@bitetrack.io
CLIENT_URL=http://localhost:3173
```

### Staging
```env
# .env.staging
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG_staging_key
EMAIL_FROM=noreply-staging@yourdomain.com
CLIENT_URL=https://staging.yourdomain.com
```

### Production
```env
# .env.production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG_production_key
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

---

## Email Templates

### Password Reset Email

**Template Location:** `utils/emailService.js` (lines 81-88)

**Variables:**
- `resetLink`: Full URL with token
- `clientUrl`: Frontend base URL
- `token`: Reset token

**Customization:**
```javascript
// Edit HTML in utils/emailService.js
html: `
  <div style="font-family: Arial, sans-serif;">
    <h2>Password Reset</h2>
    <p>Click <a href="${resetLink}">here</a> to reset your password</p>
    <p>Link expires in 24 hours</p>
  </div>
`
```

---

## Environment-Specific Behavior

### Development
- Returns token in response: `{ token: "..." }`
- Provides email preview URL: `{ emailPreview: "..." }`
- Auto-creates test accounts
- Logs credentials to console

### Production
- Does NOT return token (security)
- Generic success message always
- Silent email failures (no info leakage)
- Real email delivery

---

## Pre-Deployment Checklist

- [ ] Email credentials configured in `.env.production`
- [ ] Sender email verified with email provider
- [ ] SMTP port accessible (587 or 465)
- [ ] TLS/SSL settings correct
- [ ] Test email sent successfully
- [ ] Emails received in inbox (not spam)
- [ ] Email provider account has sufficient quota
- [ ] Error monitoring setup (Sentry/similar)
- [ ] Email logs monitored
- [ ] Credentials rotated (not shared)

---

## Useful Links

- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid SMTP Setup](https://sendgrid.com/docs/for-developers/sending-email/smtp/)
- [AWS SES SMTP](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [Ethereal Email](https://ethereal.email/)

---

## Support

For email configuration issues:
1. Check console for error messages
2. Verify credentials with email provider
3. Test SMTP connection with telnet/curl
4. Check email provider logs
5. Review firewall/network settings
