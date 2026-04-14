import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { uploadToStorj, deleteFromStorj } from "../utils/storage.js";

/**
 * HELPER: Find all child category IDs (Recursive)
 */
const getAllCategoryIds = async (parentId) => {
  let ids = [parentId];
  const children = await Category.find({ parentId }).select("_id").lean();
  for (const child of children) {
    const childIds = await getAllCategoryIds(child._id);
    ids = [...ids, ...childIds];
  }
  return ids;
};

/**
 * POST: Create a new product
 */
export const createProduct = async (req, res) => {
  try {
    const { name, basePrice, category, description, status, hasVariation } = req.body;

    const variations = req.body.variations ? JSON.parse(req.body.variations) : [];
    const attributes = req.body.attributes ? JSON.parse(req.body.attributes) : {};
    const seo = req.body.seo ? JSON.parse(req.body.seo) : {};
    const discount = req.body.discount ? JSON.parse(req.body.discount) : { type: "fixed", value: 0 };

    let imagesArray = [];
    if (req.files && req.files.length > 0) {
      // Parallel upload to Storj
      const uploadPromises = req.files.map((file) => uploadToStorj(file));
      const uploadResults = await Promise.all(uploadPromises);

      imagesArray = uploadResults.map((result, index) => ({
        url: result.ikUrl,          // ImageKit URL for frontend display
        public_id: result.filePath, // Storj path stored for future deletion
        isDefault: index === 0,
      }));
    }

    const product = new Product({
      name,
      basePrice: Number(basePrice),
      category,
      description,
      status: status || "draft",
      hasVariation: hasVariation === "true",
      variations: hasVariation === "true" ? variations : [],
      stock: hasVariation === "true" ? 0 : Number(req.body.stock || 0),
      attributes,
      discount,
      seo,
      images: imagesArray,
      createdBy: req.user?.id,
    });

    await product.save();
    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET: All products with filters and pagination
 */
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, category, status, minPrice, maxPrice, sortBy = "createdAt", order = "desc" } = req.query;
    let filter = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (category) {
      const categoryFamilyIds = await getAllCategoryIds(category);
      filter.category = { $in: categoryFamilyIds };
    }

    if (status) filter.status = status;

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET: Single product by ID
 */
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT: Update product details and images
 */
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, basePrice, category, description, status, hasVariation, existingImages } = req.body;

    // 1. Update Basic Fields
    if (name) product.name = name;
    if (basePrice) product.basePrice = Number(basePrice);
    if (category) product.category = category;
    if (description) product.description = description;
    if (status) product.status = status;

    // 2. Parse Complex Objects
    if (req.body.seo) product.seo = JSON.parse(req.body.seo);
    if (req.body.attributes) product.attributes = JSON.parse(req.body.attributes);
    if (req.body.discount) product.discount = JSON.parse(req.body.discount);

    // 3. Variations & Stock
    if (hasVariation !== undefined) {
      product.hasVariation = hasVariation === "true";
      if (product.hasVariation && req.body.variations) {
        product.variations = JSON.parse(req.body.variations);
      } else if (!product.hasVariation && req.body.stock) {
        product.stock = Number(req.body.stock);
        product.variations = [];
      }
    }

    // 4. Image Reconciliation (Delete from Storj if removed on Frontend)
    if (existingImages) {
      const keptImages = JSON.parse(existingImages);

      // Identify images to delete
      const imagesToRemove = product.images.filter(
        (oldImg) => !keptImages.some((keep) => keep.public_id === oldImg.public_id)
      );

      // Execute deletion from Storj
      for (const img of imagesToRemove) {
        if (img.public_id) await deleteFromStorj(img.public_id);
      }

      product.images = keptImages;
    }

    // 5. Append New Storj Uploads
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => uploadToStorj(file));
      const uploadResults = await Promise.all(uploadPromises);

      const newImages = uploadResults.map((result) => ({
        url: result.ikUrl,
        public_id: result.filePath,
      }));
      product.images.push(...newImages);
    }

    await product.save();
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH: Quick update for stock status or general status
 */
/**
 * PATCH: Quick update for stock or status
 */
export const updateProductStockStatus = async (req, res) => {
  try {
    // 1. Change 'stockStatus' to 'stock' (or whatever your frontend is sending)
    const { status, stock } = req.body; 
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    // 2. Update status (active/draft/archived)
    if (status) product.status = status;

    // 3. Update stock only if the product doesn't have variations
    // Because if it HAS variations, our new schema hook calculates stock automatically!
    if (stock !== undefined) {
      if (product.hasVariation) {
        return res.status(400).json({ 
          message: "Cannot manually update stock for products with variations. Update individual variations instead." 
        });
      }
      product.stock = Number(stock);
    }

    await product.save();
    res.json({ message: "Update successful", product });
  } catch (err) {
    // This is where your 500 error was being caught
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE: Archive product (Logical Delete)
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.status = "archived";
    await product.save();

    res.json({ message: "Product archived successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};