import Assignment from "../models/assignment.model.js";
import Course from "../models/course.model.js";
import Notification from "../models/notification.model.js";
import { deleteCloudinaryFile } from "../utils/fileUpload.js";

/**
 * @desc    Create a new assignment
 * @route   POST /api/courses/:courseId/assignments
 * @access  Private (Teacher/Admin only)
 */
export const createAssignment = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the instructor of the course
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create assignments for this course",
      });
    }

    // Handle file attachments
    const assignmentData = { ...req.body, course: courseId };

    // If files were uploaded, add them to the assignment
    if (req.files && req.files.length > 0) {
      assignmentData.attachments = req.files.map((file) => ({
        filename: file.originalname,
        fileUrl: file.path, // Cloudinary URL
        fileType: file.mimetype,
      }));
    }

    // Create assignment
    const assignment = await Assignment.create(assignmentData);

    // Only notify enrolled students with approved status
    const approvedStudents = course.students
      .filter((s) => s.enrollmentStatus === "approved")
      .map((s) => s.student);

    if (approvedStudents.length > 0) {
      // Create notifications for enrolled students
      const notifications = approvedStudents.map((studentId) => ({
        recipient: studentId,
        sender: req.user.id,
        type: "new_assignment",
        title: "New Assignment Posted",
        message: `New assignment "${req.body.title}" has been posted in "${course.title}"`,
        link: `/courses/${courseId}/assignments/${assignment._id}`,
        relatedId: assignment._id,
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all assignments for a course
 * @route   GET /api/courses/:courseId/assignments
 * @access  Private
 */
export const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is enrolled in the course or is the instructor
    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (student) => student.toString() === req.user.id
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access assignments for this course",
      });
    }

    // Get assignments with appropriate population
    const assignments = await Assignment.find({ course: courseId });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving assignments",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single assignment
 * @route   GET /api/assignments/:id
 * @access  Private
 */
export const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate(
      "course",
      "title instructor students"
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is allowed to access this assignment
    const course = assignment.course;
    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (student) => student.toString() === req.user.id
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this assignment",
      });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Update an assignment
 * @route   PUT /api/assignments/:id
 * @access  Private (Teacher/Admin only)
 */
export const updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(assignment.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment",
      });
    }

    // Update assignment
    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete an assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private (Teacher/Admin only)
 */
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(assignment.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assignment",
      });
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit an assignment
 * @route   POST /api/assignments/:id/submit
 * @access  Private (Student only)
 */
export const submitAssignment = async (req, res) => {
  try {
    const { submissionText } = req.body;
    let submissionUrl = req.body.submissionUrl;

    // Get the file upload info if a file was uploaded through the endpoint
    if (req.file) {
      submissionUrl = req.file.path; // Cloudinary URL or local path
    }

    // Ensure at least one submission method is provided
    if (!submissionUrl && !submissionText) {
      return res.status(400).json({
        success: false,
        message: "Please provide either a submission file or text content",
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is enrolled in the course
    const course = await Course.findById(assignment.course);
    const studentEnrollment = course.students.find(
      (s) => s.student && s.student.toString() === req.user.id
    );

    const isEnrolled =
      studentEnrollment && studentEnrollment.enrollmentStatus === "approved";

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to submit this assignment - you must be enrolled in this course",
      });
    }

    // Check if submission deadline has passed
    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);
    const submissionStatus = isLate ? "late" : "submitted";

    // Check if student has already submitted
    const existingSubmissionIndex = assignment.submissions.findIndex(
      (sub) => sub.student.toString() === req.user.id
    );

    // If there's an existing submission
    if (existingSubmissionIndex !== -1) {
      // If a new file is uploaded and there was a previous submission with a Cloudinary URL,
      // we should delete the old file to avoid unused files in storage
      const oldSubmission = assignment.submissions[existingSubmissionIndex];
      if (
        req.file &&
        oldSubmission.submissionUrl &&
        oldSubmission.submissionUrl.includes("cloudinary")
      ) {
        try {
          // Extract the public ID from the URL
          const publicId = oldSubmission.submissionUrl
            .split("/")
            .pop()
            .split(".")[0];
          // Delete the old file from Cloudinary
          await deleteCloudinaryFile(publicId);
        } catch (error) {
          console.error("Failed to delete old file from Cloudinary:", error);
          // Continue with submission even if deletion fails
        }
      }

      // Update existing submission
      assignment.submissions[existingSubmissionIndex] = {
        ...assignment.submissions[existingSubmissionIndex],
        submissionUrl: submissionUrl || oldSubmission.submissionUrl,
        submissionText: submissionText || oldSubmission.submissionText,
        submittedAt: now,
        status: submissionStatus,
      };
    } else {
      // Create new submission
      assignment.submissions.push({
        student: req.user.id,
        submissionUrl,
        submissionText,
        submittedAt: now,
        status: submissionStatus,
      });
    }

    await assignment.save();

    // Create notification for instructor
    await Notification.create({
      recipient: course.instructor,
      sender: req.user.id,
      type: "assignment_submitted",
      title: "Assignment Submission",
      message: `${req.user.name} has submitted the assignment "${
        assignment.title
      }" for "${course.title}"${isLate ? " (late submission)" : ""}`,
      link: `/courses/${course._id}/assignments/${assignment._id}`,
      relatedId: assignment._id,
    });

    res.status(200).json({
      success: true,
      message: `Assignment submitted successfully${
        isLate ? " (late submission)" : ""
      }`,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Grade an assignment submission
 * @route   POST /api/assignments/:id/grade/:submissionId
 * @access  Private (Teacher/Admin only)
 */
export const gradeSubmission = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    const { id, submissionId } = req.params;

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(assignment.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this assignment",
      });
    }

    // Find the submission
    const submission = assignment.submissions.id(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Update the grade
    submission.grade = {
      score,
      feedback,
      gradedBy: req.user.id,
      gradedAt: Date.now(),
    };

    submission.status = "graded";

    await assignment.save();

    // Create notification for student
    await Notification.create({
      recipient: submission.student,
      sender: req.user.id,
      type: "assignment_graded",
      title: "Assignment Graded",
      message: `Your submission for "${assignment.title}" has been graded.`,
      link: `/courses/${course._id}/assignments/${assignment._id}`,
      relatedId: assignment._id,
    });

    res.status(200).json({
      success: true,
      message: "Submission graded successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error grading submission",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all assignments for a student (across all courses)
 * @route   GET /api/assignments/student
 * @access  Private (Student only)
 */
export const getStudentAssignments = async (req, res) => {
  try {
    // Get all courses the student is enrolled in
    const courses = await Course.find({ students: req.user.id });
    const courseIds = courses.map((course) => course._id);

    // Get all assignments for these courses
    const assignments = await Assignment.find({
      course: { $in: courseIds },
    }).populate("course", "title instructor");

    // For each assignment, get the student's submission
    const assignmentsWithSubmission = assignments.map((assignment) => {
      const submission = assignment.submissions.find(
        (sub) => sub.student.toString() === req.user.id
      );

      return {
        ...assignment.toObject(),
        submission: submission || null,
      };
    });

    res.status(200).json({
      success: true,
      count: assignmentsWithSubmission.length,
      data: assignmentsWithSubmission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving student assignments",
      error: error.message,
    });
  }
};
