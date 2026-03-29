import nodemailer from "nodemailer";

const isTest = process.env.NODE_ENV === "test";

let transporter;
if (!isTest) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      family: 4 // FORCES IPv4 - This is the fix for Render!
    }
  });

  // Verify connection configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error("SMTP Connection Error:", error);
      if (error.code === 'ESOCKET' || error.code === 'ENETUNREACH') {
        console.warn("TIP: This networking error on Render is fixed by forcing IPv4 and using Port 587 (STARTTLS).");
      }
    } else {
      console.log("SMTP Server is ready to take our messages");
    }
  });
}

/**
 * Sends a general email using Nodemailer
 */
export async function sendEmail(to, subject, text) {
  if (isTest) {
    return { messageId: "test-id" };
  }

  const mailOptions = {
    from: `"Career-Compass" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

/**
 * Sends an OTP email using Nodemailer
 */
export async function sendOTPEmail(to, otp) {
  if (isTest) {
    return { messageId: "test-otp-id" };
  }

  const subject = "Verify your Career-Compass Account";
  const mailOptions = {
    from: `"Career-Compass" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Career-Compass</h2>
        <p>Hi there,</p>
        <p>Thank you for joining Career-Compass! Please use the following One-Time Password (OTP) to verify your account:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; 2026 Career-Compass. All rights reserved.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}
