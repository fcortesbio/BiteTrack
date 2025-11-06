import nodemailer from 'nodemailer';

// Create a transporter object using the default SMTP transport
const createTransporter = () => {
  // For development, we'll use ethereal.email (a fake SMTP service)
  // In production, you'd configure your real email service (SendGrid, AWS SES, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Generate a test email service account when in development
const getTestCredentials = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      return {
        user: testAccount.user,
        pass: testAccount.pass,
        smtp: testAccount.smtp
      };
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Could not create test account, using credentials from environment');
      // Use environment credentials if test account creation fails
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        return {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
          smtp: { host: process.env.SMTP_HOST || 'smtp.ethereal.email', port: parseInt(process.env.SMTP_PORT || '587') }
        };
      }
      return null;
    }
  }
  return null;
};

// Send password reset email
export const sendPasswordResetEmail = async (email, token) => {
  try {
    // Validate required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email service not configured. Check EMAIL_USER and EMAIL_PASSWORD environment variables.');
    }
    
    // Create client URL with token
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3173';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;
    
    // Get test credentials for development
    const testCreds = await getTestCredentials();
    
    // Create transporter
    const transporter = createTransporter();
    
    // If in development and using test account, update auth
    if (testCreds) {
      transporter.set('auth', {
        user: testCreds.user,
        pass: testCreds.pass
      });
      
      // eslint-disable-next-line no-console
      console.log('=== USING TEST EMAIL ACCOUNT ===');
      // eslint-disable-next-line no-console
      console.log(`Username: ${testCreds.user}`);
      // eslint-disable-next-line no-console
      console.log(`Password: ${testCreds.pass}`);
      // eslint-disable-next-line no-console
      console.log(`URL: ${testCreds.smtp.host}:${testCreds.smtp.port}`);
    }
    
    // Compose email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"BiteTrack" <noreply@bitetrack.io>',
      to: email,
      subject: 'BiteTrack - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">BiteTrack Password Reset</h2>
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px;">An administrator has requested a password reset for your BiteTrack account. Please click the link below to set a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4CAF50; color: white; padding: 14px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="font-size: 14px; color: #666;">For security reasons, this link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
          <p style="font-size: 12px; color: #999;">© 2025 BiteTrack. All rights reserved.</p>
        </div>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // eslint-disable-next-line no-console
    console.log('Password reset email sent successfully');
    
    // In development, log the preview URL
    if (process.env.NODE_ENV !== 'production' && testCreds) {
      // eslint-disable-next-line no-console
      console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
      return {
        success: true,
        message: `Email sent to ${email}. Test mode: ${nodemailer.getTestMessageUrl(info)}`,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return {
      success: true,
      message: `Password reset email sent to ${email}`
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      message: 'Failed to send password reset email',
      error: error.message
    };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const testCreds = await getTestCredentials();
    if (testCreds) {
      // eslint-disable-next-line no-console
      console.log('Test email configuration available');
      return testCreds;
    } else {
      // eslint-disable-next-line no-console
      console.log('Using production email configuration');
      return process.env.EMAIL_USER ? { user: process.env.EMAIL_USER } : null;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Email configuration test failed:', error);
    return null;
  }
};
