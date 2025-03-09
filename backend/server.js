import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { scheduleAllReminders } from "./src/utils/classReminders.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));

// Connect to MongoDB
import connectDB from "./src/config/db.js";
connectDB();

// Routes
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import courseRoutes from "./src/routes/course.routes.js";
import quizRoutes from "./src/routes/quiz.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import liveClassRoutes from "./src/routes/liveClass.routes.js";
import assignmentRoutes from "./src/routes/assignment.routes.js";
import discussionRoutes from "./src/routes/discussion.routes.js";
import jobRoutes from "./src/routes/job.routes.js";
import notesRoutes from "./src/routes/notes.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/live-classes", liveClassRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/notes", notesRoutes);

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("A user connected");

  // Join user to their own room for private notifications
  socket.on("joinUserRoom", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their private room`);
  });

  // Join course room for course-wide notifications
  socket.on("joinCourseRoom", (courseId) => {
    socket.join(`course:${courseId}`);
    console.log(`User joined course room: ${courseId}`);
  });

  // Handle live class events
  socket.on("joinLiveClass", (classId) => {
    socket.join(`liveClass:${classId}`);
    io.to(`liveClass:${classId}`).emit("userJoined", {
      userId: socket.id,
      time: new Date(),
    });
  });

  // Handle private messages
  socket.on("sendPrivateMessage", (data) => {
    io.to(`user:${data.recipientId}`).emit("privateMessage", {
      senderId: data.senderId,
      message: data.message,
      time: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Schedule reminders for all upcoming live classes
  scheduleAllReminders();
});
