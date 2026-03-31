import express from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
} from "../controllers/paymentController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* USER PAYMENT ROUTES */
/* -------------------------------------------------------------------------- */

// Create payment order
router.post("/order", verifyToken, createOrder);

// Verify payment after success
router.post("/verify", verifyToken, verifyPayment);

/* -------------------------------------------------------------------------- */
/* PAYMENT GATEWAY WEBHOOK */
/* -------------------------------------------------------------------------- */

// Razorpay webhook (no auth)
router.post("/webhook/razorpay", razorpayWebhook);

export default router;