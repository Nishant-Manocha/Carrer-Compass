import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "nishantmanocha885@gmail.com",
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export const sendEmail = async (to, subject, text, html) => {
  try {
    console.log(`Attempting to send email to: ${to}`);
    const info = await transporter.sendMail({
      from: `"Career-Compass" <${process.env.EMAIL_USER || "nishantmanocha885@gmail.com"}>`,
      to,
      subject,
      text,
      html
    });
    console.log("Email sent successfully to %s: %s", to, info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email to %s:", to, error);
    return null;
  }
};

export const sendOTPEmail = async (email, otp) => {
  const subject = "Verify your account - Career-Compass";
  const text = `Your OTP for Career-Compass account verification is: ${otp}. It will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #333; text-align: center;">Welcome to Career-Compass</h2>
      <p>Hi there,</p>
      <p>Thank you for signing up. Please use the following One-Time Password (OTP) to verify your account:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border-radius: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>The Career-Compass Team</p>
    </div>
  `;
  return await sendEmail(email, subject, text, html);
};
