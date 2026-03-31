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
      // unique: true,
      sparse: true,
    },
    attributes: {
      type: Map,
      of: String,
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
  { _id: true }
);

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

    /*
    |--------------------------------------------------------------------------
    | Pricing
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Dynamic Attributes
    |--------------------------------------------------------------------------
    */
    attributes: {
      type: Map,
      of: String,
    },

    /*
    |--------------------------------------------------------------------------
    | Variations
    |--------------------------------------------------------------------------
    */
    hasVariation: {
      type: Boolean,
      default: false,
    },

    variations: [variationSchema],

    /*
    |--------------------------------------------------------------------------
    | Inventory
    |--------------------------------------------------------------------------
    */
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Media
    |--------------------------------------------------------------------------
    */
    images: [
      {
        url: String,
        public_id: String,
      },
    ],

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | SEO
    |--------------------------------------------------------------------------
    */
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },

    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

/*
|--------------------------------------------------------------------------
| INDEXES (Performance Optimized)
|--------------------------------------------------------------------------
*/

// Category + Status filtering
productSchema.index({ category: 1, status: 1 });

// Variation SKU search
productSchema.index(
  { "variations.sku": 1 },
  { unique: true, sparse: true }
);

// TEXT SEARCH (IMPORTANT)
productSchema.index({
  name: "text",
  description: "text",
});

/*
|--------------------------------------------------------------------------
| PRE-SAVE HOOKS
|--------------------------------------------------------------------------
*/

// Auto-generate slug safely
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Auto-calculate total stock from variations
productSchema.pre("save", function (next) {
  if (this.hasVariation && this.variations.length > 0) {
    this.stock = this.variations.reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0
    );
  }
  next();
});

// Prevent invalid discount
productSchema.pre("save", function (next) {
  if (!this.discount || !this.discount.value) return next();

  if (this.discount.type === "percentage" && this.discount.value > 100) {
    return next(new Error("Percentage discount cannot exceed 100"));
  }

  if (
    this.discount.type === "fixed" &&
    this.discount.value > this.basePrice
  ) {
    return next(new Error("Fixed discount cannot exceed base price"));
  }

  next();
});

/*
|--------------------------------------------------------------------------
| VIRTUALS
|--------------------------------------------------------------------------
*/

// Final Price After Discount
productSchema.virtual("finalPrice").get(function () {
  if (!this.discount || !this.discount.value) return this.basePrice;

  if (this.discount.type === "percentage") {
    return this.basePrice - (this.basePrice * this.discount.value) / 100;
  }

  if (this.discount.type === "fixed") {
    return this.basePrice - this.discount.value;
  }

  return this.basePrice;
});

// Profit Margin (Advanced)
productSchema.virtual("profitMargin").get(function () {
  if (!this.variations.length) return null;

  const avgCost =
    this.variations.reduce((sum, v) => sum + v.costPrice, 0) /
    this.variations.length;

  return this.basePrice - avgCost;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

/*
|--------------------------------------------------------------------------
| EXPORT MODEL
|--------------------------------------------------------------------------
*/
export default mongoose.model("Product", productSchema);