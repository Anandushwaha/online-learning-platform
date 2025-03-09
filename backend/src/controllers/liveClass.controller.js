import LiveClass from "../models/liveClass.model.js";
import Course from "../models/course.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import moment from "moment";

// Import API utilities
import * as ZoomAPI from "../utils/zoomApi.js";
import * as GoogleMeetAPI from "../utils/googleMeetApi.js";
import * as ClassReminders from "../utils/classReminders.js";

/**
 * @desc    Get all live classes for a course
 * @route   GET /api/courses/:courseId/live-classes
 * @access  Private
 */
export const getCourseLiveClasses = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status, upcoming } = req.query;

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
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access live classes for this course",
      });
    }

    // Build query
    const query = { course: courseId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter upcoming classes if requested
    if (upcoming === "true") {
      query.startTime = { $gt: new Date() };
    }

    // Get live classes
    const liveClasses = await LiveClass.find(query)
      .populate("instructor", "name email profilePicture")
      .sort({ startTime: 1 });

    // If student, remove sensitive info
    if (!isInstructor && req.user.role !== "admin") {
      liveClasses.forEach((liveClass) => {
        // Hide host-specific information
        liveClass.zoomStartUrl = undefined;
        liveClass.zoomHostId = undefined;

        // If password protected, only show password if within 10 minutes of start time
        if (liveClass.meetingPassword) {
          const startTime = new Date(liveClass.startTime);
          const now = new Date();
          const timeDiff = startTime.getTime() - now.getTime();
          const minutesDiff = timeDiff / (1000 * 60);

          if (minutesDiff > 10) {
            liveClass.meetingPassword = undefined;
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      count: liveClasses.length,
      data: liveClasses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving live classes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single live class
 * @route   GET /api/live-classes/:id
 * @access  Private
 */
export const getLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate("instructor", "name email profilePicture")
      .populate("course", "title");

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is enrolled in the course or is the instructor
    const course = await Course.findById(liveClass.course._id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this live class",
      });
    }

    // If student, remove sensitive info
    if (!isInstructor && req.user.role !== "admin") {
      // Hide host-specific information
      liveClass.zoomStartUrl = undefined;
      liveClass.zoomHostId = undefined;

      // Check if within 10 minutes of start time to show password
      if (liveClass.meetingPassword) {
        const startTime = new Date(liveClass.startTime);
        const now = new Date();
        const timeDiff = startTime.getTime() - now.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        if (minutesDiff > 10) {
          liveClass.meetingPassword = undefined;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Schedule a new Zoom live class
 * @route   POST /api/courses/:courseId/live-classes/zoom
 * @access  Private (Teacher/Admin only)
 */
export const scheduleZoomLiveClass = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, startTime, duration, password } = req.body;

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
        message: "Not authorized to schedule live classes for this course",
      });
    }

    // Create Zoom meeting
    const zoomMeeting = await ZoomAPI.createZoomMeeting({
      topic: title,
      agenda: description,
      start_time: moment(startTime).format("YYYY-MM-DDTHH:mm:ss"),
      duration: duration,
      timezone: "UTC",
      password: password,
    });

    // Create live class in database
    const liveClass = await LiveClass.create({
      title,
      description,
      course: courseId,
      instructor: req.user.id,
      startTime: startTime,
      duration: duration,
      platform: "zoom",
      meetingLink: zoomMeeting.join_url,
      meetingId: zoomMeeting.id,
      meetingPassword: zoomMeeting.password,
      zoomMeetingId: zoomMeeting.id,
      zoomHostId: zoomMeeting.host_id,
      zoomStartUrl: zoomMeeting.start_url,
      zoomJoinUrl: zoomMeeting.join_url,
      status: "scheduled",
    });

    // Notify students about the new live class
    await ClassReminders.notifyNewLiveClass(liveClass);

    res.status(201).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error scheduling Zoom live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Schedule a new Google Meet live class
 * @route   POST /api/courses/:courseId/live-classes/google-meet
 * @access  Private (Teacher/Admin only)
 */
export const scheduleGoogleMeetLiveClass = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, startTime, duration } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId).populate({
      path: "students.student",
      select: "email",
    });

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
        message: "Not authorized to schedule live classes for this course",
      });
    }

    // Calculate end time
    const endTime = moment(startTime).add(duration, "minutes").format();

    // Get attendee emails
    const attendeeEmails = course.students
      .filter((s) => s.enrollmentStatus === "approved")
      .map((s) => s.student.email);

    // Create Google Meet
    const googleEvent = await GoogleMeetAPI.createGoogleMeeting({
      summary: title,
      description: description,
      startTime: moment(startTime).format(),
      endTime: endTime,
      attendees: attendeeEmails,
    });

    // Extract Meet link
    const meetLink = GoogleMeetAPI.extractMeetLink(googleEvent);

    if (!meetLink) {
      throw new Error("Failed to get Google Meet link");
    }

    // Create live class in database
    const liveClass = await LiveClass.create({
      title,
      description,
      course: courseId,
      instructor: req.user.id,
      startTime: startTime,
      duration: duration,
      platform: "google_meet",
      meetingLink: meetLink,
      googleMeetEventId: googleEvent.id,
      googleCalendarEventId: googleEvent.id,
      status: "scheduled",
    });

    // Notify students about the new live class
    await ClassReminders.notifyNewLiveClass(liveClass);

    res.status(201).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error scheduling Google Meet live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a live class
 * @route   PUT /api/live-classes/:id
 * @access  Private (Instructor/Admin only)
 */
export const updateLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (
      liveClass.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this live class",
      });
    }

    // Update based on platform
    if (liveClass.platform === "zoom" && liveClass.zoomMeetingId) {
      // Prepare Zoom update object
      const zoomUpdateData = {};

      if (req.body.title) zoomUpdateData.topic = req.body.title;
      if (req.body.description) zoomUpdateData.agenda = req.body.description;
      if (req.body.startTime) {
        zoomUpdateData.start_time = moment(req.body.startTime).format(
          "YYYY-MM-DDTHH:mm:ss"
        );
      }
      if (req.body.duration) zoomUpdateData.duration = req.body.duration;

      // Update Zoom meeting
      await ZoomAPI.updateZoomMeeting(liveClass.zoomMeetingId, zoomUpdateData);

      // If start time changed, we need to re-fetch the Zoom meeting to get updated URLs
      if (req.body.startTime) {
        const updatedZoomMeeting = await ZoomAPI.getZoomMeeting(
          liveClass.zoomMeetingId
        );
        req.body.meetingLink = updatedZoomMeeting.join_url;
        req.body.zoomStartUrl = updatedZoomMeeting.start_url;
        req.body.zoomJoinUrl = updatedZoomMeeting.join_url;
      }
    } else if (
      liveClass.platform === "google_meet" &&
      liveClass.googleCalendarEventId
    ) {
      // Prepare Google Calendar update object
      const googleUpdateData = {};

      if (req.body.title) googleUpdateData.summary = req.body.title;
      if (req.body.description)
        googleUpdateData.description = req.body.description;

      if (req.body.startTime) {
        const endTime = moment(req.body.startTime)
          .add(req.body.duration || liveClass.duration, "minutes")
          .format();

        googleUpdateData.start = {
          dateTime: moment(req.body.startTime).format(),
          timeZone: "UTC",
        };

        googleUpdateData.end = {
          dateTime: endTime,
          timeZone: "UTC",
        };
      }

      // Update Google Calendar event
      await GoogleMeetAPI.updateGoogleMeeting(
        liveClass.googleCalendarEventId,
        googleUpdateData
      );
    }

    // Update database record
    const updatedLiveClass = await LiveClass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify students about the updated live class
    await ClassReminders.notifyNewLiveClass(updatedLiveClass);

    res.status(200).json({
      success: true,
      data: updatedLiveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel a live class
 * @route   DELETE /api/live-classes/:id
 * @access  Private (Instructor/Admin only)
 */
export const cancelLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (
      liveClass.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this live class",
      });
    }

    // Cancel based on platform
    if (liveClass.platform === "zoom" && liveClass.zoomMeetingId) {
      // Delete Zoom meeting
      await ZoomAPI.deleteZoomMeeting(liveClass.zoomMeetingId);
    } else if (
      liveClass.platform === "google_meet" &&
      liveClass.googleCalendarEventId
    ) {
      // Delete Google Calendar event
      await GoogleMeetAPI.deleteGoogleMeeting(liveClass.googleCalendarEventId);
    }

    // Update status to canceled
    liveClass.status = "canceled";
    await liveClass.save();

    // Notify students about the cancellation
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email",
    });

    if (course) {
      const approvedStudents = course.students.filter(
        (s) => s.enrollmentStatus === "approved"
      );

      // Create notifications for all students
      const notifications = approvedStudents.map((s) => ({
        recipient: s.student._id,
        sender: req.user.id,
        type: "live_class_canceled",
        title: "Live Class Canceled",
        message: `The live class "${liveClass.title}" scheduled for ${moment(
          liveClass.startTime
        ).format("MMMM Do, h:mm a")} has been canceled.`,
        link: `/courses/${course._id}`,
        relatedId: liveClass._id,
      }));

      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error canceling live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Start a live class (record attendance)
 * @route   PUT /api/live-classes/:id/start
 * @access  Private (Instructor only)
 */
export const startLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (liveClass.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the instructor can start this live class",
      });
    }

    // Update status to in progress
    liveClass.status = "in_progress";
    await liveClass.save();

    // Notify students that class has started
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email",
    });

    if (course) {
      const approvedStudents = course.students.filter(
        (s) => s.enrollmentStatus === "approved"
      );

      // Create notifications for all students
      const notifications = approvedStudents.map((s) => ({
        recipient: s.student._id,
        sender: req.user.id,
        type: "live_class_started",
        title: "Live Class Started",
        message: `The live class "${liveClass.title}" has started. Join now!`,
        link: `/courses/${course._id}/live-classes/${liveClass._id}`,
        relatedId: liveClass._id,
      }));

      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting live class",
      error: error.message,
    });
  }
};

/**
 * @desc    End a live class
 * @route   PUT /api/live-classes/:id/end
 * @access  Private (Instructor only)
 */
export const endLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (liveClass.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the instructor can end this live class",
      });
    }

    // Update status to completed
    liveClass.status = "completed";
    await liveClass.save();

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error ending live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Join a live class (record attendance)
 * @route   PUT /api/live-classes/:id/join
 * @access  Private
 */
export const joinLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if class is active
    if (
      liveClass.status !== "in_progress" &&
      liveClass.status !== "scheduled"
    ) {
      return res.status(400).json({
        success: false,
        message: "This live class is not currently active",
      });
    }

    // Check if user is enrolled in the course or is the instructor
    const course = await Course.findById(liveClass.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to join this live class",
      });
    }

    // If instructor, start the class if not already started
    if (isInstructor && liveClass.status === "scheduled") {
      liveClass.status = "in_progress";
    }

    // Record student attendance if not instructor
    if (!isInstructor) {
      // Check if student is already in attendees
      const existingAttendee = liveClass.attendees.find(
        (a) => a.student.toString() === req.user.id
      );

      if (existingAttendee) {
        // Update join time if rejoining
        existingAttendee.joinedAt = new Date();
      } else {
        // Add new attendance record
        liveClass.attendees.push({
          student: req.user.id,
          joinedAt: new Date(),
        });

        // Notify instructor about student joining
        if (liveClass.status === "in_progress") {
          await ClassReminders.notifyStudentJoined({
            liveClassId: liveClass._id,
            studentId: req.user.id,
          });
        }
      }
    }

    await liveClass.save();

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error joining live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Leave a live class (record attendance)
 * @route   PUT /api/live-classes/:id/leave
 * @access  Private
 */
export const leaveLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // If not instructor, update student's attendance
    if (liveClass.instructor.toString() !== req.user.id) {
      // Find the student's attendance record
      const attendeeIndex = liveClass.attendees.findIndex(
        (a) => a.student.toString() === req.user.id
      );

      if (attendeeIndex !== -1) {
        const attendee = liveClass.attendees[attendeeIndex];
        const joinTime = new Date(attendee.joinedAt);
        const leaveTime = new Date();

        // Calculate duration in minutes
        const durationMs = leaveTime.getTime() - joinTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        // Update attendance record
        liveClass.attendees[attendeeIndex].leftAt = leaveTime;
        liveClass.attendees[attendeeIndex].duration = durationMinutes;

        await liveClass.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Successfully left the live class",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error leaving live class",
      error: error.message,
    });
  }
};

/**
 * @desc    Get Zoom recordings for a live class
 * @route   GET /api/live-classes/:id/recordings
 * @access  Private (Instructor only)
 */
export const getZoomRecordings = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (
      liveClass.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access recordings for this live class",
      });
    }

    // Check if this is a Zoom class
    if (liveClass.platform !== "zoom" || !liveClass.zoomMeetingId) {
      return res.status(400).json({
        success: false,
        message: "This is not a Zoom live class",
      });
    }

    // Get recordings from Zoom API
    const recordings = await ZoomAPI.getZoomRecordings(liveClass.zoomMeetingId);

    res.status(200).json({
      success: true,
      data: recordings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving Zoom recordings",
      error: error.message,
    });
  }
};

/**
 * @desc    Add recording URL to a live class
 * @route   PUT /api/live-classes/:id/recording
 * @access  Private (Instructor only)
 */
export const addRecording = async (req, res) => {
  try {
    const { recordingUrl, recordingPassword } = req.body;

    if (!recordingUrl) {
      return res.status(400).json({
        success: false,
        message: "Please provide a recording URL",
      });
    }

    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (
      liveClass.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add recordings to this live class",
      });
    }

    // Update recording info
    liveClass.recordingUrl = recordingUrl;
    liveClass.recordingPassword = recordingPassword;
    liveClass.isRecorded = true;

    await liveClass.save();

    // Notify students about the recording
    await ClassReminders.notifyRecordingAvailable(liveClass);

    res.status(200).json({
      success: true,
      data: liveClass,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding recording",
      error: error.message,
    });
  }
};

/**
 * @desc    Get attendance for a live class
 * @route   GET /api/live-classes/:id/attendance
 * @access  Private (Instructor only)
 */
export const getLiveClassAttendance = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id).populate({
      path: "attendees.student",
      select: "name email profilePicture",
    });

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    // Check if user is the instructor of the class
    if (
      liveClass.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view attendance for this live class",
      });
    }

    // Get all students in the course
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email profilePicture",
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    // Get approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    // Create attendance report
    const attendanceReport = approvedStudents.map((s) => {
      const attendanceRecord = liveClass.attendees.find(
        (a) => a.student._id.toString() === s.student._id.toString()
      );

      return {
        student: s.student,
        attended: Boolean(attendanceRecord),
        joinedAt: attendanceRecord ? attendanceRecord.joinedAt : null,
        leftAt: attendanceRecord ? attendanceRecord.leftAt : null,
        duration: attendanceRecord ? attendanceRecord.duration : 0,
      };
    });

    // Calculate attendance percentage
    const totalStudents = approvedStudents.length;
    const attendedStudents = liveClass.attendees.length;
    const attendancePercentage =
      totalStudents > 0
        ? Math.round((attendedStudents / totalStudents) * 100)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        attendedStudents,
        attendancePercentage,
        attendanceReport,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving attendance",
      error: error.message,
    });
  }
};

/**
 * @desc    Get upcoming live classes for a student (across all courses)
 * @route   GET /api/live-classes/student/upcoming
 * @access  Private (Student only)
 */
export const getUpcomingLiveClassesForStudent = async (req, res) => {
  try {
    // Get all courses the student is enrolled in
    const courses = await Course.find({
      "students.student": req.user.id,
      "students.enrollmentStatus": "approved",
    });

    const courseIds = courses.map((course) => course._id);

    // Find upcoming live classes for these courses
    const now = new Date();
    const liveClasses = await LiveClass.find({
      course: { $in: courseIds },
      startTime: { $gt: now },
      status: "scheduled",
    })
      .populate("course", "title")
      .populate("instructor", "name email profilePicture")
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: liveClasses.length,
      data: liveClasses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving upcoming live classes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get Google OAuth URL
 * @route   GET /api/live-classes/google/auth-url
 * @access  Private (Teacher/Admin only)
 */
export const getGoogleAuthUrl = async (req, res) => {
  try {
    // Check if user is a teacher or admin
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access Google authentication",
      });
    }

    const authUrl = GoogleMeetAPI.getAuthUrl();

    res.status(200).json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating Google authentication URL",
      error: error.message,
    });
  }
};

/**
 * @desc    Handle Google OAuth callback
 * @route   POST /api/live-classes/google/callback
 * @access  Private (Teacher/Admin only)
 */
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    // Check if user is a teacher or admin
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access Google authentication",
      });
    }

    // Get tokens from code
    const tokens = await GoogleMeetAPI.getTokensFromCode(code);

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        authenticated: true,
        // Don't send tokens to client for security
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error handling Google callback",
      error: error.message,
    });
  }
};
