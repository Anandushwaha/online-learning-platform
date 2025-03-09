import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadCloud } from "../utils/fileUpload.js";
import {
  getNotes,
  updateNotes,
  deleteNotes,
  searchNotes,
  getTeacherNotes,
} from "../controllers/notes.controller.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Search notes across courses the user is enrolled in
router.get("/search", searchNotes);

// Get notes created by the logged-in teacher
router.get("/teacher", authorize("teacher", "admin"), getTeacherNotes);

// Get a single note
router.get("/:id", getNotes);

// Update notes - teachers only
router.put(
  "/:id",
  authorize("teacher", "admin"),
  uploadCloud.single("file"),
  updateNotes
);

// Delete notes - teachers only
router.delete("/:id", authorize("teacher", "admin"), deleteNotes);

export default router;
