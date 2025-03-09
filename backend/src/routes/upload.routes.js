import express from "express";
import {
  uploadLocalFile,
  uploadCloudFile,
  uploadMultipleLocalFiles,
  uploadMultipleCloudFiles,
} from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadLocal, uploadCloud } from "../utils/fileUpload.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Upload single file to local storage
router.post("/local", uploadLocal.single("file"), uploadLocalFile);

// Upload single file to Cloudinary
router.post("/cloud", uploadCloud.single("file"), uploadCloudFile);

// Upload multiple files to local storage
router.post(
  "/local/multiple",
  uploadLocal.array("files", 10),
  uploadMultipleLocalFiles
);

// Upload multiple files to Cloudinary
router.post(
  "/cloud/multiple",
  uploadCloud.array("files", 10),
  uploadMultipleCloudFiles
);

export default router;
