import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // --- Core Identity ---
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // --- Personal Details ---
    dob: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: false,
    },

    // --- Location Details ---
    division: {
      type: String,
      required: false,
      trim: true,
    },
    district: {
      type: String,
      required: false,
      trim: true,
    },
    upazila: {
      type: String,
      required: false,
      trim: true,
    },
    union: {
      type: String,
      required: false,
      trim: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },

    // --- Security & Session (Kept for functionality) ---
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpSessionId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);