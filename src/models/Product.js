import mongoose from "mongoose";
import slugify from "slugify";

/*
|--------------------------------------------------------------------------
| Variation Schema
|--------------------------------------------------------------------------
*/
const variationSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      sparse: true,
    },
    attributes: {
      type: Map,
      of: String, // e.g., { "size": "M", "color": "Blue" }
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

variationSchema.virtual("profit").get(function () {
  return this.price - this.costPrice;
});

/*
|--------------------------------------------------------------------------
| Product Schema
|--------------------------------------------------------------------------
*/
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    description: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    attributes: {
      type: Map,
      of: [String], // UI Filter Map: { "color": ["Red", "Blue"] }
    },
    hasVariation: {
      type: Boolean,
      default: false,
    },
    variations: [variationSchema],
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: [
      {
        url: String,
        public_id: String,
        isDefault: { type: Boolean, default: false }
      },
    ],
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/
productSchema.index({ category: 1, status: 1 });
productSchema.index({ "variations.sku": 1 }, { unique: true, sparse: true });
productSchema.index({ name: "text", description: "text" });

/*
|--------------------------------------------------------------------------
| PRE-VALIDATE HOOKS (Business Logic)
|--------------------------------------------------------------------------
*/

productSchema.pre("validate", function (next) {
  // 1. Slug generation
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // 2. Variation Logic: Price, Stock, and Attribute Sync
  if (this.hasVariation && this.variations && this.variations.length > 0) {
    let minPrice = Infinity;
    let totalStock = 0;
    const attrMap = new Map();

    this.variations.forEach((v) => {
      // Find Minimum Price for basePrice
      if (v.price < minPrice) minPrice = v.price;

      // Accumulate Stock
      totalStock += (Number(v.stock) || 0);

      // Sync attributes to the top-level for filtering
      if (v.attributes) {
        v.attributes.forEach((val, key) => {
          if (!attrMap.has(key)) attrMap.set(key, new Set());
          attrMap.get(key).add(val);
        });
      }
    });

    this.basePrice = minPrice === Infinity ? this.basePrice : minPrice;
    this.stock = totalStock;

    // Convert Sets back to Arrays for the Map
    const finalAttributes = {};
    attrMap.forEach((valSet, key) => {
      finalAttributes[key] = Array.from(valSet);
    });
    this.attributes = finalAttributes;
  }

  next();
});

// Discount Validation
productSchema.pre("save", function (next) {
  if (!this.discount || !this.discount.value) return next();

  if (this.discount.type === "percentage" && this.discount.value > 100) {
    return next(new Error("Percentage discount cannot exceed 100"));
  }

  if (this.discount.type === "fixed" && this.discount.value > this.basePrice) {
    return next(new Error("Fixed discount cannot exceed base price"));
  }

  next();
});

/*
|--------------------------------------------------------------------------
| VIRTUALS & HELPERS
|--------------------------------------------------------------------------
*/

const calculateDiscount = (price, discount) => {
  if (!discount || !discount.value || discount.value <= 0) return price;
  let final = price;
  if (discount.type === "percentage") {
    final = price - (price * (discount.value / 100));
  } else if (discount.type === "fixed") {
    final = price - discount.value;
  }
  return Math.max(0, Math.round((final + Number.EPSILON) * 100) / 100);
};

productSchema.virtual("finalPrice").get(function () {
  return calculateDiscount(this.basePrice, this.discount);
});

productSchema.virtual("priceRange").get(function () {
  if (!this.hasVariation || !this.variations || this.variations.length === 0) {
    const price = calculateDiscount(this.basePrice, this.discount);
    return { min: price, max: price, hasRange: false };
  }

  const discountedPrices = this.variations.map(v =>
    calculateDiscount(v.price, this.discount)
  );

  const min = Math.min(...discountedPrices);
  const max = Math.max(...discountedPrices);

  return { min, max, hasRange: min !== max };
});

productSchema.virtual("estimatedProfit").get(function () {
  const currentPrice = calculateDiscount(this.basePrice, this.discount);
  if (!this.variations || this.variations.length === 0) {
    return currentPrice - (this.costPrice || 0);
  }
  const totalProfit = this.variations.reduce((sum, v) => {
    const vFinalPrice = calculateDiscount(v.price, this.discount);
    return sum + (vFinalPrice - v.costPrice);
  }, 0);
  return Math.round((totalProfit / this.variations.length + Number.EPSILON) * 100) / 100;
});

export default mongoose.model("Product", productSchema);