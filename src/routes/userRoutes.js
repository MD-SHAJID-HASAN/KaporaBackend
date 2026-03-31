import express from "express";
import {
  getProfile,
  updateProfile,
  addAddress,
  getAddresses,
  deleteAddress,
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// User profile routes
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

// Address routes
router.post("/address", verifyToken, addAddress);
router.get("/addresses", verifyToken, getAddresses);
router.delete("/address/:id", verifyToken, deleteAddress);

export default router;