import multer from "multer";

// Use memoryStorage for S3-compatible uploads (Storj)
// This is also the safest option for Render's 512MB RAM limit
const storage = multer.memoryStorage();

// Add file filter to keep your bucket clean from non-image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit size to 5MB per file
  }
});