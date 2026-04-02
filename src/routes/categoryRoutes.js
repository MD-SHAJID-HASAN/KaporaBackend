import express from "express";
import { 
  createCategory, 
  getCategories, 
  updateCategory, // Import the new update function
  deleteCategory 
} from "../controllers/categoryController.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getCategories);

// Protected Admin Routes
router.post("/", verifyToken, isAdmin, createCategory);
router.put("/:id", verifyToken, isAdmin, updateCategory);
router.delete("/:id", verifyToken, isAdmin, deleteCategory);

export default router;