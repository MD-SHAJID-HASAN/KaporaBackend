import dotenv from "dotenv";
import Order from "../models/Order.js";

dotenv.config();

/* -------------------------------------------------------------------------- */
/* CREATE ONLINE ORDER (WITHOUT RAZORPAY CALL) */
/* -------------------------------------------------------------------------- */

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      items,
      subtotal,
      discountTotal = 0,
      shippingCost = 0,
      tax = 0,
      totalAmount,
      address,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain items",
      });
    }

    const order = await Order.create({
      userId,

      items,

      subtotal,
      discountTotal,
      shippingCost,
      tax,
      totalAmount,

      shippingAddress: address,

      status: "PENDING",

      payment: {
        method: "ONLINE",
        status: "PENDING",
      },

      statusHistory: [
        {
          status: "PENDING",
          changedAt: new Date(),
        },
      ],
    });

    res.json({
      message: "Order created successfully (Razorpay skipped)",
      orderId: order._id,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Order creation failed",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* VERIFY PAYMENT (SKIPPED) */
/* -------------------------------------------------------------------------- */

export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Simulate payment success
    order.payment.status = "PAID";
    order.status = "CONFIRMED";

    order.statusHistory.push({
      status: "CONFIRMED",
      changedAt: new Date(),
    });

    await order.save();

    res.json({
      message: "Payment verified (simulated)",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* RAZORPAY WEBHOOK (SKIPPED) */
/* -------------------------------------------------------------------------- */

export const razorpayWebhook = async (req, res) => {
  console.log("🔔 Razorpay webhook skipped");

  res.json({
    status: "ok",
  });
};