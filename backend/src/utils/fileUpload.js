import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure local storage
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), "uploads");

    // Check if the directory exists, if not create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Configure Cloudinary storage
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "learning-platform",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "mp4",
      "webm",
    ],
    resource_type: "auto",
  },
});

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const fileTypes =
    /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|mp4|webm|csv|xls|xlsx|zip|rar/;

  // Check extension
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

  // Check mime type
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("File type not supported! Please upload a valid file."));
  }
};

// Create multer upload instance for local storage
export const uploadLocal = multer({
  storage: localStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: fileFilter,
});

// Create multer upload instance for Cloudinary
export const uploadCloud = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: fileFilter,
});

// Helper function to determine file type
export const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
    return "image";
  } else if ([".pdf"].includes(ext)) {
    return "pdf";
  } else if ([".doc", ".docx"].includes(ext)) {
    return "doc";
  } else if ([".ppt", ".pptx"].includes(ext)) {
    return "ppt";
  } else if ([".mp4", ".webm"].includes(ext)) {
    return "video";
  } else if ([".csv", ".xls", ".xlsx"].includes(ext)) {
    return "spreadsheet";
  } else if ([".zip", ".rar"].includes(ext)) {
    return "archive";
  } else {
    return "other";
  }
};

// Delete file from local storage
export const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Delete file from Cloudinary
export const deleteCloudinaryFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
};
