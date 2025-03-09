import express from "express";
import {
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
  getStudentAssignments,
} from "../controllers/assignment.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadCloud } from "../utils/fileUpload.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Get all assignments for a student (across all courses)
router.get("/student", authorize("student"), getStudentAssignments);

// Get single assignment
router.get("/:id", getAssignment);

// Update assignment - teachers only
router.put("/:id", authorize("teacher", "admin"), updateAssignment);

// Delete assignment - teachers only
router.delete("/:id", authorize("teacher", "admin"), deleteAssignment);

// Submit assignment - students only (with file upload support)
router.post(
  "/:id/submit",
  authorize("student"),
  uploadCloud.single("submissionFile"), // Handle file upload
  submitAssignment
);

// Grade submission - teachers only
router.post(
  "/:id/grade/:submissionId",
  authorize("teacher", "admin"),
  gradeSubmission
);

export default router;
