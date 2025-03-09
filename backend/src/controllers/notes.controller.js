import Notes from "../models/notes.model.js";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { deleteCloudinaryFile } from "../utils/fileUpload.js";

/**
 * @desc    Create new notes/study material
 * @route   POST /api/courses/:courseId/notes
 * @access  Private (Teacher/Admin only)
 */
export const createNotes = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

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
        message: "Not authorized to upload notes for this course",
      });
    }

    // Get file details from upload
    const { title, description, topic, tags, visibility } = req.body;
    const fileUrl = req.file.path; // Cloudinary URL
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const publicId = req.file.filename; // Cloudinary public ID
    const fileType = determineFileType(fileName);

    // Process tags if provided
    const tagArray = tags ? tags.split(",").map((tag) => tag.trim()) : [];

    // Create notes
    const notes = await Notes.create({
      title,
      description,
      course: courseId,
      topic,
      fileUrl,
      fileType,
      fileName,
      fileSize,
      publicId,
      tags: tagArray,
      createdBy: req.user.id,
      visibility: visibility || "enrolled_students",
    });

    // Create notifications for enrolled students (only if visibility allows)
    if (visibility !== "private") {
      // Get students with approved enrollment
      const enrolledStudents = course.students
        .filter((s) => s.enrollmentStatus === "approved")
        .map((s) => s.student);

      if (enrolledStudents.length > 0) {
        const notifications = enrolledStudents.map((studentId) => ({
          recipient: studentId,
          sender: req.user.id,
          type: "new_notes",
          title: "New Study Material Available",
          message: `New study material "${title}" has been added to "${course.title}"`,
          link: `/courses/${courseId}/notes/${notes._id}`,
          relatedId: notes._id,
        }));

        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all notes for a course
 * @route   GET /api/courses/:courseId/notes
 * @access  Private (Enrolled students, Teacher, Admin)
 */
export const getCourseNotes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { topic, search, fileType, sort } = req.query;

    // Check if course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is authorized to access notes
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    // For students, check enrollment
    let isEnrolled = false;
    if (!isInstructor && !isAdmin) {
      const studentEnrollment = course.students.find(
        (s) => s.student && s.student.toString() === req.user.id
      );
      isEnrolled =
        studentEnrollment && studentEnrollment.enrollmentStatus === "approved";

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access notes for this course",
        });
      }
    }

    // Build query
    let query = { course: courseId };

    // Apply visibility filter based on user role
    if (!isInstructor && !isAdmin) {
      query.visibility = { $in: ["public", "enrolled_students"] };
    }

    // Apply topic filter if provided
    if (topic) {
      query.topic = topic;
    }

    // Apply file type filter if provided
    if (fileType) {
      query.fileType = fileType;
    }

    // Apply search filter if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Set up sorting
    let sortOptions = { createdAt: -1 }; // Default sort by most recent

    if (sort) {
      switch (sort) {
        case "title-asc":
          sortOptions = { title: 1 };
          break;
        case "title-desc":
          sortOptions = { title: -1 };
          break;
        case "date-asc":
          sortOptions = { createdAt: 1 };
          break;
        case "popular":
          sortOptions = { downloadCount: -1 };
          break;
        // Default is already set (createdAt: -1)
      }
    }

    // Fetch notes with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const notes = await Notes.find(query)
      .sort(sortOptions)
      .skip(startIndex)
      .limit(limit)
      .populate("createdBy", "name");

    // Get total count for pagination
    const total = await Notes.countDocuments(query);

    // Get all topics for filtering options
    const topics = await Notes.distinct("topic", { course: courseId });

    // Format response
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination,
      data: notes,
      filterOptions: {
        topics,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single note
 * @route   GET /api/notes/:id
 * @access  Private (Enrolled students, Teacher, Admin)
 */
export const getNotes = async (req, res) => {
  try {
    const notes = await Notes.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("course", "title");

    if (!notes) {
      return res.status(404).json({
        success: false,
        message: "Notes not found",
      });
    }

    // Check authorization
    const course = await Course.findById(notes.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    // For students, check enrollment and visibility
    if (!isInstructor && !isAdmin) {
      // Check if private
      if (notes.visibility === "private") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access these notes",
        });
      }

      // If enrolled_students, check enrollment
      if (notes.visibility === "enrolled_students") {
        const studentEnrollment = course.students.find(
          (s) => s.student && s.student.toString() === req.user.id
        );
        const isEnrolled =
          studentEnrollment &&
          studentEnrollment.enrollmentStatus === "approved";

        if (!isEnrolled) {
          return res.status(403).json({
            success: false,
            message:
              "Not authorized to access these notes - enrollment required",
          });
        }
      }
    }

    // Increment download/view count and update last accessed
    notes.downloadCount += 1;
    notes.lastAccessed = new Date();
    await notes.save();

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Update notes
 * @route   PUT /api/notes/:id
 * @access  Private (Teacher/Admin only)
 */
export const updateNotes = async (req, res) => {
  try {
    const { title, description, topic, visibility, tags } = req.body;

    let notes = await Notes.findById(req.params.id);

    if (!notes) {
      return res.status(404).json({
        success: false,
        message: "Notes not found",
      });
    }

    // Check if user is authorized
    if (
      notes.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update these notes",
      });
    }

    // Process tags if provided
    let tagArray = notes.tags; // Default to existing tags
    if (tags) {
      tagArray = tags.split(",").map((tag) => tag.trim());
    }

    // Update file if provided
    let fileData = {};
    if (req.file) {
      // Delete old file from Cloudinary
      if (notes.publicId) {
        await deleteCloudinaryFile(notes.publicId);
      }

      // Update with new file data
      fileData = {
        fileUrl: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        publicId: req.file.filename,
        fileType: determineFileType(req.file.originalname),
      };
    }

    // Update notes
    notes = await Notes.findByIdAndUpdate(
      req.params.id,
      {
        title: title || notes.title,
        description: description || notes.description,
        topic: topic || notes.topic,
        visibility: visibility || notes.visibility,
        tags: tagArray,
        ...fileData,
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "name");

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete notes
 * @route   DELETE /api/notes/:id
 * @access  Private (Teacher/Admin only)
 */
export const deleteNotes = async (req, res) => {
  try {
    const notes = await Notes.findById(req.params.id);

    if (!notes) {
      return res.status(404).json({
        success: false,
        message: "Notes not found",
      });
    }

    // Check if user is authorized
    if (
      notes.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete these notes",
      });
    }

    // Delete file from Cloudinary
    if (notes.publicId) {
      await deleteCloudinaryFile(notes.publicId);
    }

    // Delete notes from database
    await notes.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Search notes across all courses a student is enrolled in
 * @route   GET /api/notes/search
 * @access  Private
 */
export const searchNotes = async (req, res) => {
  try {
    const { search, topic, fileType } = req.query;

    // Build base query
    let query = {};

    // If not admin or teacher, restrict to enrolled courses or public notes
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      // Get courses the student is enrolled in
      const enrolledCourses = await Course.find({
        "students.student": req.user.id,
        "students.enrollmentStatus": "approved",
      }).select("_id");

      const courseIds = enrolledCourses.map((course) => course._id);

      // User can access public notes or notes from courses they're enrolled in
      query.$or = [
        { visibility: "public" },
        {
          course: { $in: courseIds },
          visibility: "enrolled_students",
        },
      ];
    }

    // Add search term if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Add topic filter if provided
    if (topic) {
      query.topic = topic;
    }

    // Add file type filter if provided
    if (fileType) {
      query.fileType = fileType;
    }

    // Set up pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Execute search
    const notes = await Notes.find(query)
      .sort({ score: { $meta: "textScore" } })
      .skip(startIndex)
      .limit(limit)
      .populate("createdBy", "name")
      .populate("course", "title");

    // Get total count for pagination
    const total = await Notes.countDocuments(query);

    // Format response with pagination
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all notes uploaded by a teacher
 * @route   GET /api/notes/teacher
 * @access  Private (Teacher only)
 */
export const getTeacherNotes = async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this resource",
      });
    }

    // Set up pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get notes created by the teacher
    const notes = await Notes.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate("course", "title");

    // Get total count for pagination
    const total = await Notes.countDocuments({ createdBy: req.user.id });

    // Format response with pagination
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching teacher notes",
      error: error.message,
    });
  }
};

/**
 * Helper function to determine file type from filename
 */
const determineFileType = (filename) => {
  const extension = filename.split(".").pop().toLowerCase();

  const fileTypeMap = {
    pdf: "pdf",
    doc: "doc",
    docx: "doc",
    ppt: "ppt",
    pptx: "ppt",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    mp4: "video",
    webm: "video",
    avi: "video",
  };

  return fileTypeMap[extension] || "other";
};
