
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* GET USER ORDERS */
/* -------------------------------------------------------------------------- */

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* GET ORDER BY ID */
/* -------------------------------------------------------------------------- */

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!order)
      return res.status(404).json({
        message: "Order not found",
      });

    if (
      order.userId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        message: "Access denied",
      });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE ORDER STATUS (ADMIN) */
/* -------------------------------------------------------------------------- */

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({
        message: "Order not found",
      });

    order.status = status;

    order.statusHistory.push({
      status,
      changedAt: new Date(),
    });

    await order.save();

    res.json({
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update order status",
      error: err.message,
    });
  }
};


/* -------------------------------------------------------------------------- */
/* PLACE ORDER */
/* -------------------------------------------------------------------------- */

export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const isGuest = !userId;
    const { cartItems, address, shippingCost, totalAmount } = req.body; // take from frontend

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let subtotal = 0;
    let discountTotal = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);

      if (!product)
        throw new Error(`Product not found: ${item.productId}`);

      let variation = null;

      if (product.hasVariation) {
        variation = product.variations.id(item.variationId);

        if (!variation)
          throw new Error(`Variation not found`);

        if (variation.stock < item.quantity)
          throw new Error(`Insufficient stock for ${product.name}`);

        variation.stock -= item.quantity;

      } else {
        if (product.stock < item.quantity)
          throw new Error(`Insufficient stock for ${product.name}`);

        product.stock -= item.quantity;
      }

      const basePrice = variation ? variation.price : product.basePrice;
      let finalPrice = basePrice;

      if (product.discount?.value) {
        if (product.discount.type === "percentage") {
          finalPrice = basePrice - (basePrice * product.discount.value) / 100;
        }
        if (product.discount.type === "fixed") {
          finalPrice = basePrice - product.discount.value;
        }
      }

      const itemTotal = finalPrice * item.quantity;

      subtotal += basePrice * item.quantity;
      discountTotal += (basePrice - finalPrice) * item.quantity;

      orderItems.push({
        productId: product._id,
        variationId: variation?._id,
        sku: variation?.sku || product.sku,
        name: product.name,
        image: product.images?.[0]?.url,
        attributes: variation?.attributes,
        quantity: item.quantity,
        price: basePrice,
        discount: product.discount,
        finalPrice,
        total: itemTotal,
        costPrice: variation?.costPrice || 0,
      });

      await product.save();
    }

    const tax = 0; // still backend-controlled
    const finalTotalAmount = totalAmount || subtotal - discountTotal + (shippingCost || 0) + tax;

    const generateOrderNumber = () => {
      const date = new Date();
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const random = Math.floor(100000 + Math.random() * 900000);
      return `ORD-${y}${m}${d}-${random}`;
    };

    const order = await Order.create({
      userId,
      guest: isGuest,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      subtotal,
      discountTotal,
      shippingCost, // use frontend value
      tax,
      totalAmount: finalTotalAmount, // trust frontend for now
      shippingAddress: address,
      customerInfo: isGuest
        ? {
            name: address?.fullName,
            phone: address?.phone,
            email: address?.email,
          }
        : undefined,
      status: "PENDING",
      payment: {
        method: "COD",
        status: "PENDING",
      },
      statusHistory: [
        {
          status: "PENDING",
          changedAt: new Date(),
        },
      ],
    });

    if (!isGuest) {
      await Cart.findOneAndUpdate(
        { userId },
        { items: [] }
      );
    }

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id,
      orderNumber: order.orderNumber,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message,
    });
  }
};