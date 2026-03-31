import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------- REGISTER -------------------
export const register = async (req, res) => {


  try {
      console.log("BODY RECEIVED:", req.body);
    // Destructure all fields provided by the Signup form
    const {
      name,
      email,
      phone,
      password,
      gender,
      dob,
      division,
      district,
      upazila,
      union,
      address,
      role
    } = req.body;

    // 1. Validation for core required fields
    if (!email || !password || !phone) {
      return res.status(400).json({ message: "Email, phone & password are required" });
    }

    // 2. Check if user already exists (by email or phone)
    const existing = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existing) {
      return res.status(409).json({ message: "User with this email or phone already exists" });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the User with all personal and location details
    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      gender,
      dob,
      division,
      district,
      upazila,
      union: union || "N/A", // Handled if not sent by frontend
      address,
      role: role === "admin" ? "admin" : "user",
    });

    res.status(201).json({
      message: `Registered successfully as ${newUser.role}`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      message: "Registration failed",
      error: err.message // Useful for debugging schema validation issues
    });
  }
};

// ------------------- LOGIN -------------------
export const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Demo login for testing without email/SMS
    if (emailOrPhone === "demo@example.com" && password === "123456") {
      const token = jwt.sign(
        { id: "demo-user-id", role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        message: "Demo login successful",
        token,
        role: "user",
        isDummy: true
      });
    }

    // Find user by email OR phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ message: "Wrong password" });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- VERIFY OTP -------------------
export const verifyOtp = async (req, res) => {
  try {
    const { emailOrPhone, otp } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const valid = user.otp === otp && user.otpExpiry && new Date() < user.otpExpiry;

    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    user.otp = null;
    user.otpSessionId = null;
    user.otpExpiry = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- LOGOUT -------------------
export const logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

// ------------------- RESEND OTP -------------------
export const resendOtp = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.json({ message: "OTP sent (dummy mode)", otp });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- FORGOT PASSWORD -------------------
export const forgotPassword = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    res.json({ message: "Reset token generated (dummy mode)", resetToken });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- RESET PASSWORD -------------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({ resetToken: token });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};