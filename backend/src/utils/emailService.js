import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Create reusable transporter
const createTransporter = () => {
  // Validate email configuration
  if (!config.email.user || !config.email.password) {
    throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
  }

  if (config.email.user === 'your_email@gmail.com' || config.email.password === 'your_app_password_here') {
    throw new Error('Please update EMAIL_USER and EMAIL_PASSWORD in .env file with your actual Gmail credentials');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.password
    }
  });
};

// Send OTP email
export const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'MyConcrete',
        address: config.email.user
      },
      to: email,
      subject: 'Password Reset OTP - MyConcrete',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #2196F3;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .otp-box {
              background-color: #f0f0f0;
              border: 2px dashed #2196F3;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #2196F3;
              letter-spacing: 5px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName || 'User'},</p>
              
              <p>We received a request to reset your password for your MyConcrete account.</p>
              
              <p>Your One-Time Password (OTP) is:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This OTP is valid for ${config.otp.expiryMinutes} minutes only</li>
                  <li>Do not share this OTP with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p>Enter this OTP in the app to reset your password.</p>
              
              <p>Best regards,<br>MyConcrete Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2024 MyConcrete. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

// Send password reset confirmation email
export const sendPasswordResetConfirmation = async (email, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'MyConcrete',
        address: config.email.user
      },
      to: email,
      subject: 'Password Reset Successful - MyConcrete',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .c ontent {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .success-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Successful</h1>
            </div>
            <div class="content">
              <div class="success-icon">✅</div>
              
              <p>Hello ${userName || 'User'},</p>
              
              <p>Your password has been successfully reset.</p>
              
              <p>You can now login to your MyConcrete account with your new password.</p>
              
              <p>If you did not make this change, please contact our support team immediately.</p>
              
              <p>Best regards,<br>MyConcrete Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2024 MyConcrete. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw error here, as password is already reset
    return { success: false, error: error.message };
  }
};

// Send OTP via Fast2SMS
export const sendOTPSMS = async (phone, otp) => {
  try {
    const fast2smsApiKey = config.fast2sms?.apiKey;
    
    if (!fast2smsApiKey || fast2smsApiKey === 'your_fast2sms_api_key_here') {
      throw new Error('Fast2SMS API key is not configured. Please set FAST2SMS_API_KEY in .env file');
    }

    // Remove any non-digit characters from phone
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ensure phone starts with country code (91 for India)
    const phoneNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const message = `Your MyConcrete password reset OTP is: ${otp}. Valid for ${config.otp.expiryMinutes} minutes. Do not share this OTP with anyone.`;

    const response = await fetch(config.fast2sms.apiUrl, {
      method: 'POST',
      headers: {
        'authorization': fast2smsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'v3',
        sender_id: 'TXTIND',
        message: message,
        language: 'english',
        flash: 0,
        numbers: phoneNumber
      })
    });

    const data = await response.json();

    if (!response.ok || !data.return) {
      console.error('Fast2SMS error:', data);
      throw new Error(data.message || 'Failed to send SMS');
    }

    console.log('OTP SMS sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending OTP SMS:', error);
    throw new Error('Failed to send OTP SMS. Please try again.');
  }
};
