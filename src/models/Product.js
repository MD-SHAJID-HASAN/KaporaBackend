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

// Virtual for profit per variation
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
    /* Pricing */
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
    /* Dynamic Attributes for UI Filtering */
    attributes: {
      type: Map,
      of: [String], // Changed to array: { "color": ["Red", "Blue"], "size": ["M", "L"] }
    },
    hasVariation: {
      type: Boolean,
      default: false,
    },
    variations: [variationSchema],
    /* Inventory - Now strictly controlled by hooks */
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    /* Media */
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
    /* SEO */
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Corrected to reference User Model
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
| PRE-VALIDATE & PRE-SAVE HOOKS
|--------------------------------------------------------------------------
*/

// 1. Logic for Slug and Inventory Sync
productSchema.pre("validate", function (next) {
  // Slug generation
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // Auto-calculate total stock from variations to ensure DB consistency
  if (this.hasVariation && this.variations && this.variations.length > 0) {
    this.stock = this.variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    
    // Safety check: If variations exist, basePrice should ideally match the first variation
    // unless you want them to differ. 
  }
  next();
});

// 2. Discount Validation
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
| VIRTUALS
|--------------------------------------------------------------------------
*/

// Final Price calculation (For the frontend's "single price" display)
productSchema.virtual("finalPrice").get(function () {
  const priceToCalculate = this.basePrice;
  
  if (!this.discount || !this.discount.value) return priceToCalculate;

  if (this.discount.type === "percentage") {
    return priceToCalculate - (priceToCalculate * this.discount.value) / 100;
  }

  if (this.discount.type === "fixed") {
    return priceToCalculate - this.discount.value;
  }

  return priceToCalculate;
});

// Overall Profit Margin based on basePrice vs average variation cost
productSchema.virtual("estimatedProfit").get(function () {
  if (!this.variations.length) return this.basePrice;
  const avgCost = this.variations.reduce((sum, v) => sum + v.costPrice, 0) / this.variations.length;
  return this.basePrice - avgCost;
});

export default mongoose.model("Product", productSchema);