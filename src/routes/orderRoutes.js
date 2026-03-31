import express from "express";
import {
  placeOrder,
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";

import {
  verifyToken,
  isAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* USER ROUTES */
/* -------------------------------------------------------------------------- */

// Place order
router.post("/", verifyToken, placeOrder);

// Get logged-in user's orders
router.get("/my-orders", verifyToken, getUserOrders);

// Get single order
router.get("/:id", verifyToken, getOrderById);

/* -------------------------------------------------------------------------- */
/* ADMIN ROUTES */
/* -------------------------------------------------------------------------- */

// Get all orders (Admin)
router.get("/admin/all", verifyToken, isAdmin, getAllOrders);

// Update order status
router.put(
  "/admin/:id/status",
  verifyToken,
  isAdmin,
  updateOrderStatus
);

export default router;