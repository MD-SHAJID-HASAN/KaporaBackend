import Category from "../models/Category.js";
import slugify from "slugify";

// Helper for slugging
const makeSlug = (name) => slugify(name, { lower: true, strict: true });

export const createCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const existing = await Category.findOne({ name, parentId: parentId || null });
    if (existing) return res.status(400).json({ message: "Category already exists under this parent" });

    const category = await Category.create({
      name,
      slug: makeSlug(name),
      parentId: parentId || null,
      createdBy: req.user?.id || "system",
    });

    res.status(201).json({ message: "Category created successfully", category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    // Only return active categories for the store
    const categories = await Category.find({ isActive: { $ne: false } }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE CATEGORY (New)
|--------------------------------------------------------------------------
*/
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Prevent making a category its own parent
    if (parentId && parentId === id) {
      return res.status(400).json({ message: "A category cannot be its own parent" });
    }

    if (name) {
      category.name = name;
      category.slug = makeSlug(name);
    }

    category.parentId = parentId || null;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json({ message: "Category updated successfully", category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it has active subcategories before deleting
    const hasChildren = await Category.findOne({ parentId: id, isActive: true });
    if (hasChildren) {
      return res.status(400).json({ message: "Cannot delete category with active subcategories" });
    }

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    category.isActive = false;
    await category.save();

    res.json({ message: "Category deactivated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};