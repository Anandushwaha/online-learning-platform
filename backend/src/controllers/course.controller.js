import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req, res) => {
  try {
    const { category, search, difficulty, limit = 10, page = 1 } = req.query;

    // Build query
    const query = { status: "published" };

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Add difficulty filter if provided
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const courses = await Course.find(query)
      .populate("instructor", "name email profilePicture")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single course
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "name email profilePicture bio")
      .populate("students.student", "name email profilePicture");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // If course is not published and requester is not the instructor
    if (
      course.status !== "published" &&
      (!req.user || req.user.id !== course.instructor._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this course",
      });
    }

    // If user is logged in, check if they're enrolled and include progress
    let studentProgress = null;
    if (req.user) {
      const studentData = course.students.find(
        (s) => s.student._id.toString() === req.user.id
      );

      if (studentData) {
        studentProgress = studentData.progress;
      }
    }

    res.status(200).json({
      success: true,
      data: course,
      studentProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving course",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Teacher/Admin only)
 */
export const createCourse = async (req, res) => {
  try {
    // Add instructor to course data
    req.body.instructor = req.user.id;

    // Create course
    const course = await Course.create(req.body);

    // Add course to instructor's createdCourses
    await User.findByIdAndUpdate(req.user.id, {
      $push: { createdCourses: course._id },
    });

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating course",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a course
 * @route   PUT /api/courses/:id
 * @access  Private (Owner/Admin only)
 */
export const updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this course",
      });
    }

    // Update course
    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating course",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a course
 * @route   DELETE /api/courses/:id
 * @access  Private (Owner/Admin only)
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this course",
      });
    }

    // Remove course references from users
    await User.updateMany(
      { _id: { $in: course.students.map((s) => s.student) } },
      { $pull: { enrolledCourses: course._id } }
    );

    await User.findByIdAndUpdate(course.instructor, {
      $pull: { createdCourses: course._id },
    });

    // Delete course
    await course.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting course",
      error: error.message,
    });
  }
};

/**
 * @desc    Enroll in a course
 * @route   POST /api/courses/:id/enroll
 * @access  Private (Student only)
 */
export const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if course is published
    if (course.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot enroll in an unpublished course",
      });
    }

    // Check if student is already enrolled
    const alreadyEnrolled = course.students.some(
      (s) => s.student.toString() === req.user.id
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    // Determine enrollment status based on course settings
    const enrollmentStatus = course.enrollmentRequiresApproval
      ? "pending"
      : "approved";

    // Add student to course
    course.students.push({
      student: req.user.id,
      enrollmentStatus,
      progress: {
        completedModules: [],
        completedLessons: [],
        quizScores: [],
        completionPercentage: 0,
      },
    });

    await course.save();

    // Add course to student's enrolledCourses only if approved
    if (enrollmentStatus === "approved") {
      await User.findByIdAndUpdate(req.user.id, {
        $push: { enrolledCourses: course._id },
      });
    }

    // Create notification for instructor
    await Notification.create({
      recipient: course.instructor,
      sender: req.user.id,
      type: "course_enrolled",
      title:
        enrollmentStatus === "pending"
          ? "Enrollment Request"
          : "New Student Enrolled",
      message:
        enrollmentStatus === "pending"
          ? `${req.user.name} has requested to enroll in your course "${course.title}"`
          : `${req.user.name} has enrolled in your course "${course.title}"`,
      link: `/courses/${course._id}`,
      relatedId: course._id,
    });

    res.status(200).json({
      success: true,
      message:
        enrollmentStatus === "pending"
          ? "Enrollment request submitted and pending approval"
          : "Successfully enrolled in course",
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error enrolling in course",
      error: error.message,
    });
  }
};

/**
 * @desc    Approve or reject enrollment
 * @route   PUT /api/courses/:id/enrollment/:studentId
 * @access  Private (Instructor only)
 */
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id, studentId } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either approved or rejected",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update enrollment for this course",
      });
    }

    // Find student in the course
    const studentIndex = course.students.findIndex(
      (s) =>
        s.student.toString() === studentId && s.enrollmentStatus === "pending"
    );

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "No pending enrollment request found for this student",
      });
    }

    // Update enrollment status
    course.students[studentIndex].enrollmentStatus = status;
    await course.save();

    // If approved, add course to student's enrolledCourses
    if (status === "approved") {
      await User.findByIdAndUpdate(studentId, {
        $push: { enrolledCourses: course._id },
      });
    }

    // Notify student
    await Notification.create({
      recipient: studentId,
      sender: req.user.id,
      type: "course_enrolled",
      title: `Enrollment ${status === "approved" ? "Approved" : "Rejected"}`,
      message: `Your enrollment in "${course.title}" has been ${status}`,
      link: `/courses/${course._id}`,
      relatedId: course._id,
    });

    res.status(200).json({
      success: true,
      message: `Enrollment ${status}`,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating enrollment status",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all pending enrollment requests
 * @route   GET /api/courses/:id/enrollment/pending
 * @access  Private (Instructor only)
 */
export const getPendingEnrollments = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: "students.student",
      select: "name email profilePicture",
      match: { "students.enrollmentStatus": "pending" },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view enrollment requests for this course",
      });
    }

    // Filter pending enrollments
    const pendingEnrollments = course.students.filter(
      (s) => s.enrollmentStatus === "pending"
    );

    res.status(200).json({
      success: true,
      count: pendingEnrollments.length,
      data: pendingEnrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving pending enrollments",
      error: error.message,
    });
  }
};

/**
 * @desc    Add an announcement to a course
 * @route   POST /api/courses/:id/announcements
 * @access  Private (Instructor only)
 */
export const addAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add announcements to this course",
      });
    }

    // Add announcement
    course.announcements.push({ title, content });
    await course.save();

    // Get updated course with populated fields
    const updatedCourse = await Course.findById(req.params.id)
      .populate("instructor", "name email profilePicture")
      .populate("students.student", "name email profilePicture");

    // Create notifications for all enrolled students (with approved status)
    const approvedStudents = course.students
      .filter((s) => s.enrollmentStatus === "approved")
      .map((s) => s.student);

    const notifications = approvedStudents.map((student) => ({
      recipient: student,
      sender: req.user.id,
      type: "new_announcement",
      title: "New Course Announcement",
      message: `New announcement in "${course.title}": ${title}`,
      link: `/courses/${course._id}`,
      relatedId: course._id,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding announcement",
      error: error.message,
    });
  }
};

/**
 * @desc    Schedule a live class
 * @route   POST /api/courses/:id/live-classes
 * @access  Private (Instructor only)
 */
export const scheduleLiveClass = async (req, res) => {
  try {
    const { title, description, startTime, duration, meetingLink } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to schedule live classes for this course",
      });
    }

    // Add live class
    course.liveClasses.push({
      title,
      description,
      startTime,
      duration,
      meetingLink,
    });
    await course.save();

    // Get updated course with populated fields
    const updatedCourse = await Course.findById(req.params.id)
      .populate("instructor", "name email profilePicture")
      .populate("students.student", "name email profilePicture");

    // Create notifications for all enrolled students (with approved status)
    const approvedStudents = course.students
      .filter((s) => s.enrollmentStatus === "approved")
      .map((s) => s.student);

    const notifications = approvedStudents.map((student) => ({
      recipient: student,
      sender: req.user.id,
      type: "live_class_scheduled",
      title: "New Live Class Scheduled",
      message: `New live class in "${course.title}": ${title} on ${new Date(
        startTime
      ).toLocaleString()}`,
      link: `/courses/${course._id}`,
      relatedId: course._id,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error scheduling live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Add course material
 * @route   POST /api/courses/:id/materials
 * @access  Private (Instructor only)
 */
export const addCourseMaterial = async (req, res) => {
  try {
    const {
      moduleIndex,
      moduleTitle,
      moduleDescription,
      title,
      description,
      fileUrl,
      fileType,
      isRequired,
      duration,
    } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add materials to this course",
      });
    }

    // Check if module exists, if not create a new one
    let module = course.modules.find((m) => m.order === moduleIndex);

    if (!module) {
      course.modules.push({
        title: moduleTitle,
        description: moduleDescription,
        order: moduleIndex,
        materials: [],
      });
      // Find the newly added module
      module = course.modules.find((m) => m.order === moduleIndex);
    }

    // Add material to module
    module.materials.push({
      title,
      description,
      fileUrl,
      fileType,
      isRequired: isRequired !== undefined ? isRequired : true,
      duration,
    });

    // Update total course duration if this is a video
    if (fileType === "video" && duration) {
      course.totalDuration = (course.totalDuration || 0) + duration;
    }

    await course.save();

    // Get updated course with populated fields
    const updatedCourse = await Course.findById(req.params.id)
      .populate("instructor", "name email profilePicture")
      .populate("students.student", "name email profilePicture");

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding course material",
      error: error.message,
    });
  }
};

/**
 * @desc    Update student's course progress
 * @route   PUT /api/courses/:id/progress
 * @access  Private (Student only)
 */
export const updateCourseProgress = async (req, res) => {
  try {
    const { lessonId, moduleIndex, completed } = req.body;
    const courseId = req.params.id;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Find student in course
    const studentIndex = course.students.findIndex(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (studentIndex === -1) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    const student = course.students[studentIndex];

    // Update completed lessons
    if (lessonId) {
      if (completed && !student.progress.completedLessons.includes(lessonId)) {
        student.progress.completedLessons.push(lessonId);
      } else if (!completed) {
        student.progress.completedLessons =
          student.progress.completedLessons.filter((id) => id !== lessonId);
      }
    }

    // Update completed modules
    if (moduleIndex !== undefined) {
      if (
        completed &&
        !student.progress.completedModules.includes(moduleIndex)
      ) {
        student.progress.completedModules.push(moduleIndex);
      } else if (!completed) {
        student.progress.completedModules =
          student.progress.completedModules.filter(
            (index) => index !== moduleIndex
          );
      }
    }

    // Update last accessed timestamp
    student.progress.lastAccessedAt = Date.now();

    // Calculate and update completion percentage
    await course.calculateStudentProgress(req.user.id);

    // Save the updated course
    await course.save();

    res.status(200).json({
      success: true,
      data: student.progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating course progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a student's course progress
 * @route   GET /api/courses/:id/progress
 * @access  Private (Student or instructor of the course)
 */
export const getCourseProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // If instructor is checking a student's progress
    if (studentId && course.instructor.toString() === req.user.id) {
      const studentData = course.students.find(
        (s) =>
          s.student.toString() === studentId &&
          s.enrollmentStatus === "approved"
      );

      if (!studentData) {
        return res.status(404).json({
          success: false,
          message: "Student not found in this course",
        });
      }

      return res.status(200).json({
        success: true,
        data: studentData.progress,
      });
    }

    // If student is checking their own progress
    const studentData = course.students.find(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!studentData) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    res.status(200).json({
      success: true,
      data: studentData.progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving course progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all student progress for a course
 * @route   GET /api/courses/:id/students-progress
 * @access  Private (Instructor only)
 */
export const getAllStudentsProgress = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "students.student",
      "name email profilePicture"
    );

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
        message: "Not authorized to view student progress for this course",
      });
    }

    // Filter approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    res.status(200).json({
      success: true,
      count: approvedStudents.length,
      data: approvedStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving student progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all courses created by the instructor
 * @route   GET /api/courses/instructor
 * @access  Private (Instructor only)
 */
export const getInstructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
      .populate("students.student", "name email profilePicture")
      .sort({ createdAt: -1 });

    // Get stats for each course
    const coursesWithStats = courses.map((course) => {
      const approvedStudents = course.students.filter(
        (s) => s.enrollmentStatus === "approved"
      );
      const pendingEnrollments = course.students.filter(
        (s) => s.enrollmentStatus === "pending"
      );

      // Calculate average progress
      const totalProgress = approvedStudents.reduce(
        (sum, student) => sum + (student.progress.completionPercentage || 0),
        0
      );

      const averageProgress = approvedStudents.length
        ? Math.round(totalProgress / approvedStudents.length)
        : 0;

      return {
        ...course.toObject(),
        stats: {
          enrolledStudentsCount: approvedStudents.length,
          pendingEnrollmentsCount: pendingEnrollments.length,
          averageProgress,
        },
      };
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: coursesWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving instructor courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all courses enrolled by the student
 * @route   GET /api/courses/enrolled
 * @access  Private (Student only)
 */
export const getEnrolledCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      "students.student": req.user.id,
      "students.enrollmentStatus": "approved",
    })
      .populate("instructor", "name email profilePicture")
      .sort({ "students.enrolledAt": -1 });

    // Get progress for each course
    const coursesWithProgress = courses.map((course) => {
      const studentData = course.students.find(
        (s) =>
          s.student.toString() === req.user.id &&
          s.enrollmentStatus === "approved"
      );

      return {
        ...course.toObject(),
        progress: studentData ? studentData.progress : null,
      };
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: coursesWithProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving enrolled courses",
      error: error.message,
    });
  }
};
