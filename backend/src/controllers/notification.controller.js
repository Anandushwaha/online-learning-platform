import Notification from "../models/notification.model.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { limit = 10, page = 1, unreadOnly } = req.query;

    // Build query
    const query = { recipient: req.user.id };

    // Add unread filter if provided
    if (unreadOnly === "true") {
      query.read = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get notifications
    const notifications = await Notification.find(query)
      .populate("sender", "name email profilePicture")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Notification.countDocuments(query);

    // Get count of unread notifications
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this notification",
      });
    }

    // Mark as read
    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message,
    });
  }
};

/**
 * @desc    Get notification count
 * @route   GET /api/notifications/count
 * @access  Private
 */
export const getNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting notification count",
      error: error.message,
    });
  }
};
