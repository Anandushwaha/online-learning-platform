import Discussion from "../models/discussion.model.js";
import Course from "../models/course.model.js";
import Notification from "../models/notification.model.js";

/**
 * @desc    Create a new discussion post
 * @route   POST /api/courses/:courseId/discussions
 * @access  Private
 */
export const createDiscussion = async (req, res) => {
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
        message: "Not authorized to create discussions for this course",
      });
    }

    // Create discussion
    const discussion = await Discussion.create({
      ...req.body,
      course: courseId,
      author: req.user.id,
      // Only teachers can create announcements
      isAnnouncement:
        req.body.isAnnouncement && (isInstructor || req.user.role === "admin"),
    });

    // Populate author info for response
    await discussion.populate("author", "name email profilePicture role");

    // Create notifications for relevant users
    const recipients = [];

    if (isInstructor) {
      // If instructor creates a post, notify all students
      recipients.push(...course.students);
    } else {
      // If student creates a post, notify instructor
      recipients.push(course.instructor);
    }

    if (discussion.isAnnouncement) {
      // For announcements, create notifications for all enrolled students
      const notifications = course.students.map((student) => ({
        recipient: student,
        sender: req.user.id,
        type: "new_announcement",
        title: "New Course Announcement",
        message: `New announcement in "${course.title}": ${discussion.title}`,
        link: `/courses/${courseId}/discussions/${discussion._id}`,
        relatedId: discussion._id,
      }));

      await Notification.insertMany(notifications);
    } else {
      // For regular discussions
      const notificationType = "new_discussion";
      const notificationTitle = "New Discussion Post";
      const notificationMessage = `New discussion in "${course.title}": ${discussion.title}`;

      for (const recipientId of recipients) {
        // Skip creating notification for the author
        if (recipientId.toString() === req.user.id) continue;

        await Notification.create({
          recipient: recipientId,
          sender: req.user.id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          link: `/courses/${courseId}/discussions/${discussion._id}`,
          relatedId: discussion._id,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating discussion",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all discussions for a course
 * @route   GET /api/courses/:courseId/discussions
 * @access  Private
 */
export const getCourseDiscussions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { isAnnouncement, limit = 10, page = 1 } = req.query;

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
        message: "Not authorized to view discussions for this course",
      });
    }

    // Build query
    const query = { course: courseId };

    // Filter announcements if specified
    if (isAnnouncement === "true") {
      query.isAnnouncement = true;
    } else if (isAnnouncement === "false") {
      query.isAnnouncement = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get discussions
    const discussions = await Discussion.find(query)
      .populate("author", "name email profilePicture role")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ isPinned: -1, createdAt: -1 });

    // Get total count for pagination
    const total = await Discussion.countDocuments(query);

    res.status(200).json({
      success: true,
      count: discussions.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: discussions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving discussions",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single discussion
 * @route   GET /api/discussions/:id
 * @access  Private
 */
export const getDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate("author", "name email profilePicture role")
      .populate("replies.author", "name email profilePicture role");

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check if user has access to the course
    const course = await Course.findById(discussion.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (student) => student.toString() === req.user.id
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this discussion",
      });
    }

    res.status(200).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving discussion",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a discussion
 * @route   PUT /api/discussions/:id
 * @access  Private (Author/Admin only)
 */
export const updateDiscussion = async (req, res) => {
  try {
    let discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check ownership
    if (
      discussion.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this discussion",
      });
    }

    // Update discussion
    discussion = await Discussion.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("author", "name email profilePicture role");

    res.status(200).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating discussion",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a discussion
 * @route   DELETE /api/discussions/:id
 * @access  Private (Author/Admin only)
 */
export const deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check ownership or if user is course instructor
    const course = await Course.findById(discussion.course);
    const isAuthor = discussion.author.toString() === req.user.id;
    const isInstructor = course && course.instructor.toString() === req.user.id;

    if (!isAuthor && !isInstructor && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this discussion",
      });
    }

    await discussion.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting discussion",
      error: error.message,
    });
  }
};

/**
 * @desc    Add a reply to a discussion
 * @route   POST /api/discussions/:id/replies
 * @access  Private
 */
export const addReply = async (req, res) => {
  try {
    const { content } = req.body;
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check if user has access to the course
    const course = await Course.findById(discussion.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (student) => student.toString() === req.user.id
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reply to this discussion",
      });
    }

    // Add reply
    discussion.replies.push({
      content,
      author: req.user.id,
    });

    discussion.updatedAt = Date.now();
    await discussion.save();

    // Populate for response
    await discussion.populate("author", "name email profilePicture role");
    await discussion.populate(
      "replies.author",
      "name email profilePicture role"
    );

    // Notify the original author if not the same as replier
    if (discussion.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: discussion.author,
        sender: req.user.id,
        type: "discussion_reply",
        title: "New Reply to Your Discussion",
        message: `${req.user.name} replied to your discussion "${discussion.title}"`,
        link: `/courses/${discussion.course}/discussions/${discussion._id}`,
        relatedId: discussion._id,
      });
    }

    res.status(200).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding reply",
      error: error.message,
    });
  }
};

/**
 * @desc    Pin/Unpin a discussion
 * @route   PUT /api/discussions/:id/pin
 * @access  Private (Instructor/Admin only)
 */
export const togglePinDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check if user is the course instructor
    const course = await Course.findById(discussion.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to pin/unpin discussions",
      });
    }

    // Toggle pin status
    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    // Populate for response
    await discussion.populate("author", "name email profilePicture role");

    res.status(200).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling pin status",
      error: error.message,
    });
  }
};
