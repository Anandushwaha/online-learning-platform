import express from "express";
import {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  applyForJob,
  updateApplicationStatus,
  getJobApplications,
  getStudentApplications,
} from "../controllers/job.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Get all jobs
router.get("/", getJobs);

// Get student's job applications
router.get("/applications", authorize("student"), getStudentApplications);

// Create job - teachers only
router.post("/", authorize("teacher", "admin"), createJob);

// Get single job
router.get("/:id", getJob);

// Update job - owner only
router.put("/:id", updateJob);

// Delete job - owner only
router.delete("/:id", deleteJob);

// Apply for job - students only
router.post("/:id/apply", authorize("student"), applyForJob);

// Get job applications - job poster only
router.get("/:id/applications", getJobApplications);

// Update application status - job poster only
router.put("/:id/applications/:applicationId", updateApplicationStatus);

export default router;
