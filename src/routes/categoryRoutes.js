import express from "express";
import { createCategory, getCategories, deleteCategory } from "../controllers/categoryController.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, isAdmin, createCategory);
router.get("/", getCategories);
router.delete("/:id", verifyToken, isAdmin, deleteCategory);


export default router;
