import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./src/routes/authRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import videoRoutes from "./src/routes/videoRoutes.js";
import adminSetupRoute from "./src/routes/adminSetupRoute.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://kapora.netlify.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("/{*splat}", cors(corsOptions));

// Razorpay webhook needs raw body
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminSetupRoute);

// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "src", "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// MongoDB connection

// const mongoURI = "mongodb://127.0.0.1:27017/ecommerce";
const mongoURI = process.env.DB_URI;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check route
app.get("/health/db", async (req, res) => {
  try {
    const state = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.json({ status: state === "connected" ? "ok" : "degraded", db: state });
  } catch (err) {
    res.json({ status: "degraded", db: "disconnected" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    details: err.stack || err,
  });
});