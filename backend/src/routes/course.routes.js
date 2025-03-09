import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  addAnnouncement,
  scheduleLiveClass,
  addCourseMaterial,
  getInstructorCourses,
  getEnrolledCourses,
  updateEnrollmentStatus,
  getPendingEnrollments,
  updateCourseProgress,
  getCourseProgress,
  getAllStudentsProgress,
} from "../controllers/course.controller.js";

// Import assignment controller
import {
  createAssignment,
  getCourseAssignments,
} from "../controllers/assignment.controller.js";

// Import discussion controller
import {
  createDiscussion,
  getCourseDiscussions,
} from "../controllers/discussion.controller.js";

// Import quiz controller
import {
  createQuiz,
  getCourseQuizzes,
} from "../controllers/quiz.controller.js";

// Import live class controller
import {
  getCourseLiveClasses,
  scheduleZoomLiveClass,
  scheduleGoogleMeetLiveClass,
} from "../controllers/liveClass.controller.js";

// Import upload controller
import { uploadCloud } from "../utils/fileUpload.js";

// Import notes controller
import {
  createNotes,
  getCourseNotes,
} from "../controllers/notes.controller.js";

const router = express.Router();

// Public routes
router.get("/", getCourses);
router.get("/:id", getCourse);

// Protected routes
router.use(protect);

// Student dashboard route - get enrolled courses
router.get("/student/enrolled", authorize("student"), getEnrolledCourses);

// Teacher dashboard route - get created courses
router.get(
  "/teacher/courses",
  authorize("teacher", "admin"),
  getInstructorCourses
);

// Enroll in a course - student only
router.post("/:id/enroll", authorize("student"), enrollCourse);

// Enrollment management - teacher only
router.get(
  "/:id/enrollment/pending",
  authorize("teacher", "admin"),
  getPendingEnrollments
);
router.put(
  "/:id/enrollment/:studentId",
  authorize("teacher", "admin"),
  updateEnrollmentStatus
);

// Course progress tracking
router.get("/:id/progress", getCourseProgress);
router.put("/:id/progress", authorize("student"), updateCourseProgress);
router.get(
  "/:id/students-progress",
  authorize("teacher", "admin"),
  getAllStudentsProgress
);

// Course CRUD operations
router.post("/", authorize("teacher", "admin"), createCourse);
router.put("/:id", authorize("teacher", "admin"), updateCourse);
router.delete("/:id", authorize("teacher", "admin"), deleteCourse);

// Course announcements
router.post(
  "/:id/announcements",
  authorize("teacher", "admin"),
  addAnnouncement
);

// Course live classes
router.get("/:courseId/live-classes", protect, getCourseLiveClasses);

router.post(
  "/:courseId/live-classes/zoom",
  protect,
  authorize("teacher", "admin"),
  scheduleZoomLiveClass
);

router.post(
  "/:courseId/live-classes/google-meet",
  protect,
  authorize("teacher", "admin"),
  scheduleGoogleMeetLiveClass
);

// Course materials
router.post("/:id/materials", authorize("teacher", "admin"), addCourseMaterial);

// Course assignments
router.get("/:courseId/assignments", getCourseAssignments);
router.post(
  "/:courseId/assignments",
  authorize("teacher", "admin"),
  uploadCloud.array("assignmentFiles", 5),
  createAssignment
);

// Course discussions
router.get("/:courseId/discussions", getCourseDiscussions);
router.post("/:courseId/discussions", createDiscussion);

// Course quizzes
router.get("/:courseId/quizzes", getCourseQuizzes);
router.post("/:courseId/quizzes", authorize("teacher", "admin"), createQuiz);

// Course notes
router.get("/:courseId/notes", protect, getCourseNotes);
router.post(
  "/:courseId/notes",
  protect,
  authorize("teacher", "admin"),
  uploadCloud.single("file"),
  createNotes
);

export default router;
