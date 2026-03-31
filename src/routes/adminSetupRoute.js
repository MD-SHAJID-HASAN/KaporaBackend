import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/**
 * Route: POST /api/admin/setup
 * Description: Create an admin account (only accessible with ADMIN_SECRET)
 */
router.post("/setup", async (req, res) => {
  try {
    const { email, password, secret } = req.body;

    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Unauthorized: Invalid secret" });
    }

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      email,
      password: hashedPassword,
      role: "admin",
    });

    res.json({ message: "Admin created successfully", admin: newAdmin.email });
  } catch (err) {
    console.error("Admin setup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;