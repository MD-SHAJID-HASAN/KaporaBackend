import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// GET CART
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId })
      .populate("items.productId");

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ADD TO CART
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.quantity < quantity)
      return res.status(400).json({ message: "Not enough stock" });

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    product.quantity -= quantity;

    await product.save();
    await cart.save();

    res.json({ message: "Product added to cart", cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE CART ITEM
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params; // this will be productId
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) => i.productId.toString() === itemId
    );

    if (!item)
      return res.status(404).json({ message: "Cart item not found" });

    const product = await Product.findById(item.productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    const diff = quantity - item.quantity;

    if (diff > 0 && product.quantity < diff) {
      return res
        .status(400)
        .json({ message: "Not enough stock available" });
    }

    product.quantity -= diff;
    item.quantity = quantity;

    await product.save();
    await cart.save();

    res.json({ message: "Cart item updated", cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// REMOVE FROM CART
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params; // productId

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (i) => i.productId.toString() === itemId
    );

    if (itemIndex === -1)
      return res.status(404).json({ message: "Cart item not found" });

    const item = cart.items[itemIndex];

    const product = await Product.findById(item.productId);
    if (product) {
      product.quantity += item.quantity;
      await product.save();
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.json({ message: "Item removed from cart", cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CLEAR CART
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    await cart.save();

    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};