import Category from "../models/Category.js";
import slugify from "slugify";
/*
|--------------------------------------------------------------------------
| CREATE CATEGORY
|--------------------------------------------------------------------------
*/
export const createCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Prevent duplicate name under same parent
    const existing = await Category.findOne({
      name,
      parentId: parentId || null,
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Category already exists under this parent" });
    }

    const category = await Category.create({
      name,
      parentId: parentId || null,
      createdBy: req.user?.id || "system", // adjust if using auth middleware
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| DEFAULT ROOT CATEGORIES
|--------------------------------------------------------------------------
*/
const defaultCategories = [
  "Clothing",
];

/*
|--------------------------------------------------------------------------
| GET CATEGORIES (Auto-seed Root Categories)
|--------------------------------------------------------------------------
*/
export const getCategories = async (req, res) => {
  try {
    // Fetch existing categories
    const existing = await Category.find();
    const existingNames = existing.map((c) => c.name);

    // Auto-seed missing default categories
    const missingCategories = defaultCategories.filter(
      (n) => !existingNames.includes(n)
    );

    if (missingCategories.length > 0) {
      await Category.insertMany(
        missingCategories.map((name) => ({
          name,
          slug: slugify(name, { lower: true, strict: true }), // generate slug
          createdBy: "system", // required field
        }))
      );
      console.log("Auto-added missing categories:", missingCategories);
    }

    // Fetch again after seeding
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| SOFT DELETE CATEGORY
|--------------------------------------------------------------------------
*/
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({ message: "Category deactivated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};