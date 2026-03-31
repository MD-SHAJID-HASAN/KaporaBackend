import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "avif"],
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

export const uploadMultiple = multer({ storage });

