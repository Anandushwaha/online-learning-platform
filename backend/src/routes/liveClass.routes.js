import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import * as liveClassController from "../controllers/liveClass.controller.js";

const router = express.Router();

// Routes for /api/live-classes
// Get upcoming classes for student
router.get(
  "/student/upcoming",
  protect,
  liveClassController.getUpcomingLiveClassesForStudent
);

// Google Auth URL and callback
router.get(
  "/google/auth-url",
  protect,
  authorize("teacher", "admin"),
  liveClassController.getGoogleAuthUrl
);

router.post(
  "/google/callback",
  protect,
  authorize("teacher", "admin"),
  liveClassController.handleGoogleCallback
);

// Individual live class routes
router.get("/:id", protect, liveClassController.getLiveClass);

router.put(
  "/:id",
  protect,
  authorize("teacher", "admin"),
  liveClassController.updateLiveClass
);

router.delete(
  "/:id",
  protect,
  authorize("teacher", "admin"),
  liveClassController.cancelLiveClass
);

// Manage live class status
router.put(
  "/:id/start",
  protect,
  authorize("teacher", "admin"),
  liveClassController.startLiveClass
);

router.put(
  "/:id/end",
  protect,
  authorize("teacher", "admin"),
  liveClassController.endLiveClass
);

// Join/Leave live class (record attendance)
router.put("/:id/join", protect, liveClassController.joinLiveClass);
router.put("/:id/leave", protect, liveClassController.leaveLiveClass);

// Recordings
router.get(
  "/:id/recordings",
  protect,
  authorize("teacher", "admin"),
  liveClassController.getZoomRecordings
);

router.put(
  "/:id/recording",
  protect,
  authorize("teacher", "admin"),
  liveClassController.addRecording
);

// Attendance
router.get(
  "/:id/attendance",
  protect,
  authorize("teacher", "admin"),
  liveClassController.getLiveClassAttendance
);

export default router;
