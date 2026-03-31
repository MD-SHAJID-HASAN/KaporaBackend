// import mongoose from "mongoose";
// import Order from "../models/Order.js";
// import Cart from "../models/Cart.js";
// import Product from "../models/Product.js";

// /* -------------------------------------------------------------------------- */
// /* PLACE ORDER */
// /* -------------------------------------------------------------------------- */

// export const placeOrder = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const userId = req.user.id;
//     const { cartItems, address } = req.body;

//     if (!cartItems || cartItems.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     let subtotal = 0;
//     let discountTotal = 0;
//     const orderItems = [];

//     for (const item of cartItems) {
//       const product = await Product.findById(item.productId).session(session);

//       if (!product)
//         throw new Error(`Product not found: ${item.productId}`);

//       let variation = null;

//       /* ------------------------ VARIATION SUPPORT ------------------------ */

//       if (product.hasVariation) {
//         variation = product.variations.id(item.variationId);

//         if (!variation)
//           throw new Error(`Variation not found`);

//         if (variation.stock < item.quantity)
//           throw new Error(
//             `Insufficient stock for ${product.name}`
//           );

//         variation.stock -= item.quantity;
//       } else {
//         if (product.stock < item.quantity)
//           throw new Error(
//             `Insufficient stock for ${product.name}`
//           );

//         product.stock -= item.quantity;
//       }

//       /* ------------------------ PRICE CALCULATION ------------------------ */

//       const basePrice = variation ? variation.price : product.basePrice;

//       let finalPrice = basePrice;

//       if (product.discount?.value) {
//         if (product.discount.type === "percentage") {
//           finalPrice =
//             basePrice - (basePrice * product.discount.value) / 100;
//         }

//         if (product.discount.type === "fixed") {
//           finalPrice = basePrice - product.discount.value;
//         }
//       }

//       const itemTotal = finalPrice * item.quantity;

//       subtotal += basePrice * item.quantity;
//       discountTotal += (basePrice - finalPrice) * item.quantity;

//       /* ------------------------ ORDER ITEM SNAPSHOT ------------------------ */

//       orderItems.push({
//         productId: product._id,
//         variationId: variation?._id,
//         sku: variation?.sku || product.sku,

//         name: product.name,
//         image: product.images?.[0]?.url,

//         attributes: variation?.attributes,

//         quantity: item.quantity,

//         price: basePrice,

//         discount: product.discount,

//         finalPrice,
//         total: itemTotal,

//         costPrice: variation?.costPrice || 0,
//       });

//       await product.save({ session });
//     }

//     /* ------------------------ TOTAL CALCULATION ------------------------ */

//     const shippingCost = 0;
//     const tax = 0;

//     const totalAmount =
//       subtotal - discountTotal + shippingCost + tax;

//     /* ------------------------ CREATE ORDER ------------------------ */

//     const order = await Order.create(
//       [
//         {
//           userId,
//           items: orderItems,

//           subtotal,
//           discountTotal,
//           shippingCost,
//           tax,
//           totalAmount,

//           shippingAddress: address,

//           status: "PENDING",

//           payment: {
//             method: "COD",
//             status: "PENDING",
//           },

//           statusHistory: [
//             {
//               status: "PENDING",
//               changedAt: new Date(),
//             },
//           ],
//         },
//       ],
//       { session }
//     );

//     /* ------------------------ CLEAR CART ------------------------ */

//     await Cart.findOneAndUpdate(
//       { userId },
//       { items: [] },
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({
//       message: "Order placed successfully",
//       orderId: order[0]._id,
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();

//     console.error(err);

//     res.status(500).json({
//       message: err.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /* GET ALL ORDERS (ADMIN) */
// /* -------------------------------------------------------------------------- */

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

import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

/* -------------------------------------------------------------------------- */
/* PLACE ORDER */
/* -------------------------------------------------------------------------- */

export const placeOrder = async (req, res) => {

  // ❌ REMOVED (NOT SUPPORTED IN COMPASS)
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const userId = req.user.id;
    const { cartItems, address } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let subtotal = 0;
    let discountTotal = 0;
    const orderItems = [];

    for (const item of cartItems) {

      // ❌ removed .session(session)
      const product = await Product.findById(item.productId);

      if (!product)
        throw new Error(`Product not found: ${item.productId}`);

      let variation = null;

      /* ---------------- VARIATION ---------------- */

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

      /* ---------------- PRICE ---------------- */

      const basePrice = variation ? variation.price : product.basePrice;
      let finalPrice = basePrice;

      if (product.discount?.value) {
        if (product.discount.type === "percentage") {
          finalPrice =
            basePrice - (basePrice * product.discount.value) / 100;
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

      // ❌ removed { session }
      await product.save();
    }

    /* ---------------- TOTAL ---------------- */

    const shippingCost = 0;
    const tax = 0;

    const totalAmount =
      subtotal - discountTotal + shippingCost + tax;

    /* ---------------- CREATE ORDER ---------------- */

    // ❌ removed array + session
    const order = await Order.create({
      userId,
      items: orderItems,
      subtotal,
      discountTotal,
      shippingCost,
      tax,
      totalAmount,
      shippingAddress: address,
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

    /* ---------------- CLEAR CART ---------------- */

    await Cart.findOneAndUpdate(
      { userId },
      { items: [] }
    );

    // ❌ removed transaction commit
    // await session.commitTransaction();
    // session.endSession();

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id,
    });

  } catch (err) {

    // ❌ removed abort
    // await session.abortTransaction();
    // session.endSession();

    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};