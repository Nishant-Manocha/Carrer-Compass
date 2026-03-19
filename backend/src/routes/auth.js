import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendOTPEmail, sendEmail } from "../utils/mailer.js";

const router = express.Router();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input format" });
  }

  // Password validation: 8+ chars, upper, number, special
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: "Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character." 
    });
  }

  try {
    const userEmail = email.toLowerCase();
    let user = await User.findOne({ email: userEmail });
    
    // Debug log
    console.log(`[DEBUG] Signup attempt for: ${userEmail}`);
    if (user) {
      console.log(`[DEBUG] User found in DB. isVerified: ${user.isVerified}`);
    } else {
      console.log(`[DEBUG] No user found with this email in DB.`);
    }

    // Restrict signup for admin emails
    const adminEmails = ["admin@gmail.com"];
    if (adminEmails.includes(userEmail)) {
      return res.status(403).json({ error: "This is a restricted admin email. Please login directly." });
    }

    if (user && user.isVerified) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Automatically assign admin role based on whitelisted emails
    let finalRole = adminEmails.includes(email.toLowerCase()) ? "admin" : "user";

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // Update existing unverified user
      user.name = name;
      user.password = hashedPassword;
      user.role = finalRole;
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      // Create new user (unverified)
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: finalRole,
        otp,
        otpExpires
      });
    }

    // Send OTP email
    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      message: "OTP sent to your email. Please verify to complete signup.",
      email: user.email
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "User already verified" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      message: "New OTP sent to your email.",
      email: user.email
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  if (typeof email !== "string" || typeof otp !== "string") {
    return res.status(400).json({ error: "Invalid input format" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    // Send final welcome email
    await sendEmail(
      user.email,
      "Welcome to Career-Compass!",
      `Hi ${user.name},\n\nYour account has been successfully verified. Welcome to Career-Compass!\n\nBest regards,\nCareer-Compass Team`
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input format" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isVerified) {
      return res.status(401).json({ error: "Invalid credentials or account not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    // Send login email
    await sendEmail(
      user.email,
      "New Login to Career-Compass",
      `Hi ${user.name},\n\nA new login was detected on your Career-Compass account.\n\nBest regards,\nCareer-Compass Team`
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
