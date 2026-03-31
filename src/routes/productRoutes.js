import express from "express";
import { 
  createProduct, 
  getProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct,
  updateProductStockStatus
} from "../controllers/productController.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import { uploadMultiple } from "../config/multerCloud.js";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getProducts);

// --- PROTECTED ROUTES ---

// 2. ADD THIS ROUTE HERE (Before the generic /:id routes)
router.patch("/:id/stock-status", verifyToken, isAdmin, updateProductStockStatus);

router.get("/:id", getProduct);
router.post("/", verifyToken, isAdmin, uploadMultiple.array("images", 5), createProduct);

// Note: Using PUT for full updates and PATCH for partial updates is standard REST practice
router.put("/:id", verifyToken, isAdmin, uploadMultiple.array("images", 5), updateProduct);
router.delete("/:id", verifyToken, isAdmin, deleteProduct);

export default router;