import express from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cartController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getCart); 
router.post("/add", verifyToken, addToCart);
router.put("/update/:itemId", verifyToken, updateCartItem); 
router.delete("/remove/:itemId", verifyToken, removeFromCart); 
router.delete("/clear", verifyToken, clearCart); 

export default router;
