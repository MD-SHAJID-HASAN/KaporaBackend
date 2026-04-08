import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------------------------- */
/* OPTIONAL AUTH (Guest + Logged-in users) */
/* -------------------------------------------------------------------------- */

export const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null; // guest
    return next();
  }

  const token = authHeader.split(" ")[1];

  // ✅ treat empty or placeholder token as guest
  if (!token || token === "null" || token === "undefined") {
    req.user = null;
    return next();
  }

  // ✅ Dummy token for testing
  if (token === "DUMMY_TOKEN") {
    req.user = {
      id: "11111111-1111-1111-1111-111111111111",
      role: "user",
      isDummy: true,
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // logged-in user
    next();
  } catch (err) {
    // ❌ only reject if token is truly invalid
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/* -------------------------------------------------------------------------- */
/* REQUIRE AUTH (Strict login required) */
/* -------------------------------------------------------------------------- */

export const verifyToken = (req, res, next) => {
  optionalVerifyToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }
    next();
  });
};

/* -------------------------------------------------------------------------- */
/* ADMIN CHECK */
/* -------------------------------------------------------------------------- */

export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};