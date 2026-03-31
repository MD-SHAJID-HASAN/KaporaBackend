import Product from "../models/Product.js";
import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
*/
export const createProduct = async (req, res) => {
  try {
    // 1. Handle incoming FormData fields (which are strings)
    const {
      name,
      basePrice,
      stock,
      category,
      description,
      discount,
      attributes,
      hasVariation,
      status,
    } = req.body;

    // 2. Parse JSON strings back into objects/arrays
    const seo = req.body.seo ? JSON.parse(req.body.seo) : {};
    const variations = req.body.variations ? JSON.parse(req.body.variations) : [];

    // 3. Extract Cloudinary URLs from req.files (populated by Multer)
    let imagesArray = [];
    if (req.files && req.files.length > 0) {
      imagesArray = req.files.map((file) => ({
        url: file.path,        // Cloudinary URL
        public_id: file.filename, // Cloudinary ID (crucial for deleting)
      }));
    }

    // 4. Required fields check
    if (!name || !basePrice || !category) {
      return res.status(400).json({ message: "Name, basePrice and category are required" });
    }

    // 5. Calculate stock
    let totalStock = Number(stock) || 0;
    if (hasVariation === "true" && Array.isArray(variations)) {
      totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }

    const product = await Product.create({
      name,
      basePrice: Number(basePrice),
      stock: totalStock,
      category,
      description,
      discount: Number(discount) || 0,
      attributes: attributes ? JSON.parse(attributes) : [],
      hasVariation: hasVariation === "true",
      variations: hasVariation === "true" ? variations : [],
      images: imagesArray,
      status: status || "draft",
      seo,
      createdBy: req.user?.id || "system",
    });

    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/*
|--------------------------------------------------------------------------
| GET PRODUCTS (SEARCH + FILTER + PAGINATION)
|--------------------------------------------------------------------------
*/
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    let filter = {};

    // TEXT SEARCH (Requires text index on name + description)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const sortOptions = {
      [sortBy]: order === "asc" ? 1 : -1,
    };

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort(sortOptions)
      .skip((page - 1) * limit)
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

/*
|--------------------------------------------------------------------------
| GET SINGLE PRODUCT
|--------------------------------------------------------------------------
*/
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category");

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|--------------------------------------------------------------------------
*/
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // 1. Destructure from req.body
    const {
      name,
      basePrice,
      stock,
      category,
      description,
      discount,
      status,
      removeImages,
      keepExistingImages,
    } = req.body;

    // 2. PARSE JSON STRINGS (The missing step causing your error)
    const seo = req.body.seo ? JSON.parse(req.body.seo) : product.seo;
    const variations = req.body.variations ? JSON.parse(req.body.variations) : product.variations;
    const attributes = req.body.attributes ? JSON.parse(req.body.attributes) : product.attributes;
    const hasVariation = req.body.hasVariation === "true"; // Convert string "true" to boolean

    let updatedImages = product.images || [];

    // 3. REMOVE SELECTED IMAGES
    if (removeImages) {
      const removeList = JSON.parse(removeImages);
      for (const public_id of removeList) {
        await cloudinary.uploader.destroy(public_id);
        updatedImages = updatedImages.filter((img) => img.public_id !== public_id);
      }
    }

    // 4. ADD NEW IMAGES
    if (req.files?.length) {
      const newImages = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
      }));
      updatedImages = [...updatedImages, ...newImages];
    }

    // 5. UPDATE FIELDS
    product.name = name ?? product.name;
    product.basePrice = basePrice ? Number(basePrice) : product.basePrice;
    product.category = category ?? product.category;
    product.description = description ?? product.description;
    product.discount = discount ? Number(discount) : product.discount;
    product.attributes = attributes;
    product.status = status ?? product.status;
    product.seo = seo; // Now a real Object, not a string
    product.images = updatedImages;
    product.hasVariation = hasVariation;

    // 6. HANDLE VARIATIONS + STOCK AUTO-CALC
    if (product.hasVariation && Array.isArray(variations)) {
      product.variations = variations;
      product.stock = variations.reduce(
        (sum, v) => sum + (Number(v.stock) || 0),
        0
      );
    } else {
      product.variations = [];
      product.stock = stock ? Number(stock) : product.stock;
    }

    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| QUICK UPDATE STOCK & STATUS
|--------------------------------------------------------------------------
*/
// controller/productController.js

// controller/productController.js

export const updateProductStockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, status } = req.body;

    console.log("Update Request Received for ID:", id, "Data:", req.body);

    const updateData = {};
    if (stock !== undefined) updateData.stock = Number(stock);
    if (status) updateData.status = status;

    // findByIdAndUpdate is "leaner" and won't hang on unrelated validation errors
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true } 
    );

    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Update Successful:", product._id);
    // CRITICAL: You must send a response back to the frontend
    return res.status(200).json({
      message: "Quick update successful",
      product,
    });

  } catch (err) {
    console.error("SERVER CRASH ERROR:", err.message);
    // CRITICAL: Even if it fails, you must tell the frontend it failed
    return res.status(500).json({ message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| SOFT DELETE (ARCHIVE)
|--------------------------------------------------------------------------
*/
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    product.status = "archived";
    await product.save();

    res.json({ message: "Product archived successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};