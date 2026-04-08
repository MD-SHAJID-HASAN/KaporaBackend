import mongoose from "mongoose";

/* |-------------------------------------------------------------------------- |
| Order Item Schema
|-------------------------------------------------------------------------- */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variationId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    sku: String,

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: String,

    attributes: {
      type: Map,
      of: String,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    costPrice: {
      type: Number,
      default: 0,
    },

    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      value: Number,
    },

    finalPrice: {
      type: Number,
      required: true,
    },

    total: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

/* |-------------------------------------------------------------------------- |
| Address Schema
|-------------------------------------------------------------------------- */

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: {type: String, default: "", required: false},
    division: { type: String, required: true },
    district: { type: String, required: true },
    area: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, default: "" },
  },
  { _id: false }
);


/* |-------------------------------------------------------------------------- |
| Payment Schema
|-------------------------------------------------------------------------- */
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    paidAt: Date,
  },
  { _id: false }
);

/* |-------------------------------------------------------------------------- |
| Order Schema
|-------------------------------------------------------------------------- */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true, 
      index: true,
    },

    items: [orderItemSchema],

    /* Pricing */
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },

    /* Address */
    shippingAddress: addressSchema,
    billingAddress: addressSchema,

    /* Order Status */
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      default: "PENDING",
      index: true,
    },

    statusHistory: [
      {
        status: String,
        changedAt: Date,
      },
    ],

    /* Payment */
    payment: paymentSchema,

    notes: String,

    createdBy: String,
  },
  { timestamps: true }
);

/* |-------------------------------------------------------------------------- |
| INDEXES
|-------------------------------------------------------------------------- */

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "payment.status": 1 });

/* |-------------------------------------------------------------------------- |
| PRE-SAVE HOOK
|-------------------------------------------------------------------------- */

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.orderNumber = `ORD-${Date.now()}-${random}`;
  }
  next();
});

/* |-------------------------------------------------------------------------- |
| EXPORT
|-------------------------------------------------------------------------- */

export default mongoose.model("Order", orderSchema);