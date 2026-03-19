import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || "re_iGz4WMjX_4he2W7NZ1HDBw5b5asu3bAzn");

/**
 * Sends a general email using Resend
 */
export async function sendEmail(to, subject, text) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Career-Compass <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: text,
    });

    if (error) {
      console.error("Resend Error:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Resend Catch Error:", err);
    throw err;
  }
}

/**
 * Sends an OTP email using Resend
 */
export async function sendOTPEmail(to, otp) {
  const subject = "Verify your Career-Compass Account";
  const text = `Your OTP for verification is: ${otp}. This code will expire in 10 minutes.`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Career-Compass <onboarding@resend.dev>',
      to: [to],
      subject: subject,
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
      `,
    });

    if (error) {
      console.error("Resend OTP Error:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Resend OTP Catch Error:", err);
    throw err;
  }
}
