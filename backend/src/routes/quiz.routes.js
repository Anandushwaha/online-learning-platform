import express from "express";
import {
  getQuiz,
  updateQuiz,
  deleteQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentQuizAttempts,
  getQuizResults,
} from "../controllers/quiz.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Get student's quiz attempts across all courses
router.get("/attempts", authorize("student"), getStudentQuizAttempts);

// Get a single quiz
router.get("/:id", getQuiz);

// Update a quiz - teacher only
router.put("/:id", authorize("teacher", "admin"), updateQuiz);

// Delete a quiz - teacher only
router.delete("/:id", authorize("teacher", "admin"), deleteQuiz);

// Start a quiz attempt - student only
router.post("/:id/attempt", authorize("student"), startQuizAttempt);

// Submit a quiz attempt - student only
router.put("/:id/attempt", authorize("student"), submitQuizAttempt);

// Get quiz results - teacher only
router.get("/:id/results", authorize("teacher", "admin"), getQuizResults);

export default router;
