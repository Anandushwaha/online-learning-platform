import { sendEmail } from "./emailService.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import LiveClass from "../models/liveClass.model.js";
import moment from "moment";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send reminder email for an upcoming live class
 * @param {Object} options - Options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {Object} options.liveClass - Live class object
 * @param {string} options.reminderType - Type of reminder (24h, 1h, 15min)
 */
export const sendClassReminderEmail = async (options) => {
  try {
    const { email, name, liveClass, reminderType } = options;

    let timeText = "";
    switch (reminderType) {
      case "24h":
        timeText = "24 hours";
        break;
      case "1h":
        timeText = "1 hour";
        break;
      case "15min":
        timeText = "15 minutes";
        break;
      default:
        timeText = "soon";
    }

    const startTime = moment(liveClass.startTime).format(
      "dddd, MMMM Do YYYY, h:mm a"
    );
    const duration = liveClass.duration;

    const subject = `Reminder: Live Class "${liveClass.title}" starts in ${timeText}`;

    const message = `
      Hello ${name},
      
      This is a reminder that your live class "${
        liveClass.title
      }" will start in ${timeText}.
      
      Class Details:
      - Date & Time: ${startTime}
      - Duration: ${duration} minutes
      - Platform: ${liveClass.platform === "zoom" ? "Zoom" : "Google Meet"}
      - Meeting Link: ${liveClass.meetingLink}
      ${liveClass.meetingId ? `- Meeting ID: ${liveClass.meetingId}` : ""}
      ${
        liveClass.meetingPassword
          ? `- Password: ${liveClass.meetingPassword}`
          : ""
      }
      
      Course: ${liveClass.course.title}
      
      Please join the class on time. The meeting link will be active 10 minutes before the scheduled time.
      
      Thank you,
      Learning Platform Team
    `;

    await sendEmail({
      email,
      subject,
      message,
    });

    return true;
  } catch (error) {
    console.error("Error sending class reminder email:", error);
    return false;
  }
};

/**
 * Create in-app notification for live class reminder
 * @param {Object} options - Options
 * @param {string} options.userId - User ID
 * @param {Object} options.liveClass - Live class object
 * @param {string} options.reminderType - Type of reminder (24h, 1h, 15min)
 */
export const sendClassReminderNotification = async (options) => {
  try {
    const { userId, liveClass, reminderType } = options;

    let timeText = "";
    switch (reminderType) {
      case "24h":
        timeText = "24 hours";
        break;
      case "1h":
        timeText = "1 hour";
        break;
      case "15min":
        timeText = "15 minutes";
        break;
      default:
        timeText = "soon";
    }

    const startTime = moment(liveClass.startTime).format("h:mm a");

    await Notification.create({
      recipient: userId,
      sender: liveClass.instructor,
      type: "live_class_reminder",
      title: `Class Reminder: ${timeText} until start`,
      message: `Your live class "${liveClass.title}" will start in ${timeText} at ${startTime}.`,
      link: `/courses/${liveClass.course._id}/live-classes/${liveClass._id}`,
      relatedId: liveClass._id,
    });

    return true;
  } catch (error) {
    console.error("Error sending class reminder notification:", error);
    return false;
  }
};

/**
 * Process reminders for all upcoming live classes
 * This function should be called periodically (e.g., every 5 minutes) by a scheduler
 */
export const processClassReminders = async () => {
  try {
    const now = new Date();

    // Find upcoming classes in the next 24 hours
    const upcomingClasses = await LiveClass.find({
      startTime: {
        $gt: now,
        $lt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      status: "scheduled",
    })
      .populate("course")
      .populate("instructor");

    for (const liveClass of upcomingClasses) {
      const startTime = new Date(liveClass.startTime);
      const timeDiff = startTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check if 24-hour reminder should be sent
      if (hoursDiff <= 24 && hoursDiff > 23) {
        await sendRemindersForClass(liveClass, "24h");
      }

      // Check if 1-hour reminder should be sent
      if (hoursDiff <= 1 && hoursDiff > 0.9) {
        await sendRemindersForClass(liveClass, "1h");
      }

      // Check if 15-minute reminder should be sent
      if (hoursDiff <= 0.25 && hoursDiff > 0.2) {
        await sendRemindersForClass(liveClass, "15min");
      }
    }

    return true;
  } catch (error) {
    console.error("Error processing class reminders:", error);
    return false;
  }
};

/**
 * Send reminders for a specific live class
 * @param {Object} liveClass - Live class object
 * @param {string} reminderType - Type of reminder (24h, 1h, 15min)
 */
export const sendRemindersForClass = async (liveClass, reminderType) => {
  try {
    // Check if this type of reminder has already been sent
    const reminderAlreadySent = liveClass.remindersSent.some(
      (reminder) => reminder.type === reminderType
    );

    if (reminderAlreadySent) {
      return false; // Skip if already sent
    }

    // Get course and enrolled students
    const courseId = liveClass.course._id || liveClass.course;
    const course = await Course.findById(courseId).populate({
      path: "students.student",
      select: "name email",
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Get approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    // Send reminders to each student
    for (const student of approvedStudents) {
      // Send email reminder
      await sendClassReminderEmail({
        email: student.student.email,
        name: student.student.name,
        liveClass,
        reminderType,
      });

      // Send in-app notification
      await sendClassReminderNotification({
        userId: student.student._id,
        liveClass,
        reminderType,
      });
    }

    // Mark reminder as sent
    liveClass.remindersSent.push({
      type: reminderType,
      sentAt: new Date(),
    });

    await liveClass.save();

    return true;
  } catch (error) {
    console.error(`Error sending ${reminderType} reminders:`, error);
    return false;
  }
};

/**
 * Notify students about a new live class
 * @param {Object} liveClass - Live class object
 * @returns {Promise<boolean>} Success status
 */
export const notifyNewLiveClass = async (liveClass) => {
  try {
    // Get course with enrolled students
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email",
    });

    if (!course) {
      console.error("Course not found when sending live class notifications");
      return;
    }

    // Get instructor name
    const instructor = await User.findById(liveClass.instructor, "name");

    // Filter only approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    if (approvedStudents.length === 0) {
      console.log("No approved students to notify about the live class");
      return;
    }

    // Format date and time for notifications
    const formattedDate = moment(liveClass.startTime).format("MMMM Do, YYYY");
    const formattedTime = moment(liveClass.startTime).format("h:mm a");

    // Create in-app notifications
    const notifications = approvedStudents.map((s) => ({
      recipient: s.student._id,
      sender: liveClass.instructor,
      type: "live_class",
      title: "New Live Class Scheduled",
      message: `A new live class "${liveClass.title}" has been scheduled for ${formattedDate} at ${formattedTime}`,
      link: `/courses/${course._id}/live-classes/${liveClass._id}`,
      relatedId: liveClass._id,
    }));

    await Notification.insertMany(notifications);

    // Send email notifications if enabled
    const emailPromises = approvedStudents.map((s) => {
      const studentEmail = s.student.email;
      const studentName = s.student.name;

      const emailData = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: studentEmail,
        subject: `New Live Class: ${liveClass.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Live Class Scheduled</h2>
            <p>Hello ${studentName},</p>
            <p>A new live class has been scheduled for the course "${
              course.title
            }".</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">${liveClass.title}</h3>
              <p style="margin-bottom: 5px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin-bottom: 5px;"><strong>Time:</strong> ${formattedTime}</p>
              <p style="margin-bottom: 5px;"><strong>Duration:</strong> ${
                liveClass.duration
              } minutes</p>
              <p style="margin-bottom: 5px;"><strong>Instructor:</strong> ${
                instructor.name
              }</p>
              <p style="margin-bottom: 0;"><strong>Platform:</strong> ${
                liveClass.platform === "zoom" ? "Zoom" : "Google Meet"
              }</p>
            </div>
            <p>${liveClass.description}</p>
            <p>You can join the class by logging into your account and navigating to the course page.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL}/courses/${
          course._id
        }/live-classes/${liveClass._id}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Class Details
              </a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              You're receiving this email because you're enrolled in "${
                course.title
              }".
            </p>
          </div>
        `,
      };

      return transporter.sendMail(emailData);
    });

    await Promise.all(emailPromises);

    // Schedule a reminder for 15 minutes before the class
    const reminderTime = new Date(liveClass.startTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);

    const now = new Date();
    const timeDiff = reminderTime.getTime() - now.getTime();

    // Only schedule if the reminder time is in the future
    if (timeDiff > 0) {
      setTimeout(() => {
        sendClassStartingReminders(liveClass._id);
      }, timeDiff);
    }
  } catch (error) {
    console.error("Error sending live class notifications:", error);
  }
};

/**
 * Notify instructor about a student joining a live class
 * @param {Object} params - Parameters containing liveClassId and studentId
 * @returns {Promise<void>}
 */
export const notifyStudentJoined = async ({ liveClassId, studentId }) => {
  try {
    const liveClass = await LiveClass.findById(liveClassId);

    if (!liveClass) {
      console.error("Live class not found when notifying instructor");
      return;
    }

    const student = await User.findById(studentId, "name");

    if (!student) {
      console.error("Student not found when notifying instructor");
      return;
    }

    // Create in-app notification for instructor
    await Notification.create({
      recipient: liveClass.instructor,
      sender: studentId,
      type: "student_joined",
      title: "Student Joined Live Class",
      message: `${student.name} has joined your live class "${liveClass.title}"`,
      link: `/courses/${liveClass.course}/live-classes/${liveClass._id}/attendees`,
      relatedId: liveClass._id,
    });
  } catch (error) {
    console.error("Error notifying instructor about student joining:", error);
  }
};

/**
 * Notify students when recording is available
 * @param {Object} liveClass - Live class object with recording data
 */
export const notifyRecordingAvailable = async (liveClass) => {
  try {
    if (!liveClass.recordingUrl) {
      throw new Error("No recording URL available");
    }

    // Get course with enrolled students
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email",
    });

    if (!course) {
      console.error("Course not found when sending recording notifications");
      return;
    }

    // Filter only approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    // Create in-app notifications
    const notifications = approvedStudents.map((s) => ({
      recipient: s.student._id,
      sender: liveClass.instructor,
      type: "recording",
      title: "Class Recording Available",
      message: `The recording for "${liveClass.title}" is now available`,
      link: `/courses/${course._id}/live-classes/${liveClass._id}`,
      relatedId: liveClass._id,
    }));

    await Notification.insertMany(notifications);

    // Send email notifications if enabled
    const emailPromises = approvedStudents.map((s) => {
      const studentEmail = s.student.email;
      const studentName = s.student.name;

      const emailData = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: studentEmail,
        subject: `Recording Available: ${liveClass.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Class Recording Available</h2>
            <p>Hello ${studentName},</p>
            <p>The recording for the live class "${liveClass.title}" from your course "${course.title}" is now available.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">${liveClass.title}</h3>
              <p style="margin-bottom: 5px;"><strong>Recording URL:</strong> ${liveClass.recordingUrl}</p>
            </div>
            <p>You can access the recording from your course dashboard or by following the link below:</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${liveClass.recordingUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Recording
              </a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              You're receiving this email because you're enrolled in "${course.title}".
            </p>
          </div>
        `,
      };

      return transporter.sendMail(emailData);
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Error sending recording notifications:", error);
  }
};

/**
 * Send reminders that a class is starting soon
 * @param {string} liveClassId - The live class ID
 * @returns {Promise<void>}
 */
const sendClassStartingReminders = async (liveClassId) => {
  try {
    const liveClass = await LiveClass.findById(liveClassId);

    if (!liveClass || liveClass.status === "canceled") {
      return;
    }

    // Get course with enrolled students
    const course = await Course.findById(liveClass.course).populate({
      path: "students.student",
      select: "name email",
    });

    if (!course) {
      console.error("Course not found when sending class starting reminders");
      return;
    }

    // Filter only approved students
    const approvedStudents = course.students.filter(
      (s) => s.enrollmentStatus === "approved"
    );

    // Create in-app notifications
    const notifications = approvedStudents.map((s) => ({
      recipient: s.student._id,
      sender: liveClass.instructor,
      type: "live_class_reminder",
      title: "Live Class Starting Soon",
      message: `The live class "${liveClass.title}" is starting in 15 minutes`,
      link: `/courses/${course._id}/live-classes/${liveClass._id}`,
      relatedId: liveClass._id,
    }));

    await Notification.insertMany(notifications);

    // Note: You could add email reminders here as well
  } catch (error) {
    console.error("Error sending class starting reminders:", error);
  }
};

/**
 * Schedule reminders for all upcoming live classes
 * This should be called when the server starts
 * @returns {Promise<void>}
 */
export const scheduleAllReminders = async () => {
  try {
    const now = new Date();

    // Find all upcoming live classes
    const upcomingClasses = await LiveClass.find({
      startTime: { $gt: now },
      status: "scheduled",
    });

    // Schedule a reminder for each class
    upcomingClasses.forEach((liveClass) => {
      const reminderTime = new Date(liveClass.startTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 15);

      const timeDiff = reminderTime.getTime() - now.getTime();

      // Only schedule if the reminder time is in the future
      if (timeDiff > 0) {
        setTimeout(() => {
          sendClassStartingReminders(liveClass._id);
        }, timeDiff);
      }
    });

    console.log(
      `Scheduled reminders for ${upcomingClasses.length} upcoming live classes`
    );
  } catch (error) {
    console.error("Error scheduling all reminders:", error);
  }
};
