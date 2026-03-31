import mongoose from "mongoose";
import slugify from "slugify";

/*
|--------------------------------------------------------------------------
| Category Schema
|--------------------------------------------------------------------------
*/
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category Name is Mandatory!"],
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    depth: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
| Indexes
|--------------------------------------------------------------------------
*/

// Fast tree queries
categorySchema.index({ parentId: 1, isActive: 1 });

// Prevent duplicate names under same parent
categorySchema.index({ name: 1, parentId: 1 }, { unique: true });

/*
|--------------------------------------------------------------------------
| Pre-save Hooks
|--------------------------------------------------------------------------
*/

// Auto-generate slug
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Auto-calculate depth
categorySchema.pre("save", async function (next) {
  if (!this.parentId) {
    this.depth = 0;
  } else {
    const parent = await mongoose.model("Category").findById(this.parentId);
    this.depth = parent ? parent.depth + 1 : 0;
  }
  next();
});

/*
|--------------------------------------------------------------------------
| Virtuals
|--------------------------------------------------------------------------
*/

// Populate subcategories easily
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentId",
});

categorySchema.set("toObject", { virtuals: true });
categorySchema.set("toJSON", { virtuals: true });

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/
export default mongoose.model("Category", categorySchema);