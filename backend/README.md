# Online Learning Platform - Full-Stack Application

A comprehensive online learning platform with separate dashboards for students and teachers. The platform supports user authentication, course management, live classes, assignments, job searching, and real-time notifications.

## 🚀 Features

### Authentication & User Management

- JWT-based authentication with role-based access control
- User registration with email verification
- Secure login & password reset functionality
- Profile management for both students and teachers

### Course Management

- **For Teachers:**

  - Create, edit, and delete courses
  - Upload various content types (videos, PDFs, notes, quizzes)
  - Organize materials in structured modules
  - Track student enrollment and progress
  - Approve/reject enrollment requests
  - Analyze student performance

- **For Students:**
  - Browse and search available courses
  - Enroll in courses (with optional teacher approval)
  - Track course completion percentage
  - Access course materials and resources
  - Receive course announcements

### Live Classes

- Schedule and manage live video sessions
- Join live classes with real-time interaction
- Recording and playback options
- Attendance tracking
- Integration with Zoom and Google Meet APIs
- Automated notifications and reminders
- Detailed analytics for instructors

### Notes Management

- Teachers can upload various file types (PDF, DOC, PPT, images, videos)
- Study materials are organized by course and topic
- Advanced search functionality with multiple filtering options
- Material categorization with tags for improved searchability
- Access control based on enrollment status
- Download tracking to identify popular materials
- Notification system for new study materials

### Assignments & Quizzes

- Create and manage assignments with deadlines
- Support various question types in quizzes
- Automated grading for quizzes
- Manual grading with feedback for assignments
- Track submission status and grades

### Discussion Forum

- Course-specific discussion boards
- Post and reply to questions
- Pin important discussions
- Filter by announcements and regular discussions

### Job Search

- Browse job and internship listings
- Apply for positions through the platform
- Track application status
- For teachers/admins: Post job opportunities

### Notifications

- Real-time notifications for platform activities
- Email notifications for important events
- Notification read/unread status

## 📚 Technology Stack

### Backend

- Node.js with Express.js
- MongoDB with Mongoose ODM
- JSON Web Tokens (JWT) for authentication
- Socket.io for real-time features
- Multer and Cloudinary for file uploads
- Bcrypt for password hashing
- Nodemailer for email functionality
- Zoom API for video conferencing integration
- Google Calendar API for Google Meet integration
- Moment.js for date handling

### Frontend (Planned/In Progress)

- React with React Router
- Material UI components
- Socket.io client for real-time features
- Axios for API requests
- React Context API for state management

## 🛠️ Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Clone the repository
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Create a `.env` file based on the `.env.example` file
5. Start the development server: `npm run dev`

### Environment Variables

The API requires the following environment variables:

```
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.mongodb.net/learning_platform
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000

# JWT Cookie settings
JWT_COOKIE_EXPIRE=7

# Email settings
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_EMAIL=your_ethereal_email
SMTP_PASSWORD=your_ethereal_password
SMTP_SECURE=false
FROM_NAME=Learning Platform
FROM_EMAIL=noreply@learning-platform.com

# Cloudinary settings
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Zoom API settings
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
ZOOM_USER_ID=your_zoom_user_id_or_me

# Google API settings
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/live-classes/google/callback
```

## 📋 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:resettoken` - Reset password
- `PUT /api/auth/updateprofile` - Update user profile
- `PUT /api/auth/updatepassword` - Update password
- `PUT /api/auth/updateprofilepicture` - Update profile picture

### Course Endpoints

- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get a single course
- `POST /api/courses` - Create a new course (Teacher/Admin only)
- `PUT /api/courses/:id` - Update a course (Owner/Admin only)
- `DELETE /api/courses/:id` - Delete a course (Owner/Admin only)
- `POST /api/courses/:id/enroll` - Enroll in a course (Student only)
- `GET /api/courses/student/enrolled` - Get enrolled courses (Student only)
- `GET /api/courses/teacher/courses` - Get created courses (Teacher only)

### Course Content Endpoints

- `POST /api/courses/:id/announcements` - Add an announcement
- `POST /api/courses/:id/materials` - Add course material
- `GET /api/courses/:id/materials` - Get course materials
- See "Live Class Endpoints" section for live class APIs

### Notes Management Endpoints

- `GET /api/courses/:courseId/notes` - Get all notes for a course (with filtering)
- `POST /api/courses/:courseId/notes` - Upload new study material (Teacher/Admin only)
- `GET /api/notes/:id` - Get a specific study material
- `PUT /api/notes/:id` - Update a study material (Teacher/Admin only)
- `DELETE /api/notes/:id` - Delete a study material (Teacher/Admin only)
- `GET /api/notes/search` - Search study materials across enrolled courses
- `GET /api/notes/teacher` - Get all study materials uploaded by a teacher (Teacher only)

### Enrollment Management Endpoints

- `GET /api/courses/:id/enrollment/pending` - Get pending enrollments
- `PUT /api/courses/:id/enrollment/:studentId` - Update enrollment status
- `GET /api/courses/:id/students-progress` - Get all students' progress

### Progress Tracking Endpoints

- `GET /api/courses/:id/progress` - Get course progress
- `PUT /api/courses/:id/progress` - Update course progress

### Assignment Endpoints

- `GET /api/courses/:courseId/assignments` - Get course assignments
- `POST /api/courses/:courseId/assignments` - Create an assignment
- `GET /api/assignments/:id` - Get a single assignment
- `PUT /api/assignments/:id` - Update an assignment
- `DELETE /api/assignments/:id` - Delete an assignment
- `POST /api/assignments/:id/submit` - Submit an assignment
- `POST /api/assignments/:id/grade/:submissionId` - Grade a submission

### Quiz Endpoints

- `GET /api/courses/:courseId/quizzes` - Get course quizzes
- `POST /api/courses/:courseId/quizzes` - Create a quiz
- `GET /api/quizzes/:id` - Get a single quiz
- `PUT /api/quizzes/:id` - Update a quiz
- `DELETE /api/quizzes/:id` - Delete a quiz
- `POST /api/quizzes/:id/attempt` - Start a quiz attempt
- `PUT /api/quizzes/:id/attempt` - Submit a quiz attempt
- `GET /api/quizzes/attempts` - Get student's quiz attempts
- `GET /api/quizzes/:id/results` - Get quiz results (Teacher only)

### Discussion Endpoints

- `GET /api/courses/:courseId/discussions` - Get course discussions
- `POST /api/courses/:courseId/discussions` - Create a discussion
- `GET /api/discussions/:id` - Get a single discussion
- `PUT /api/discussions/:id` - Update a discussion
- `DELETE /api/discussions/:id` - Delete a discussion
- `POST /api/discussions/:id/replies` - Add a reply
- `PUT /api/discussions/:id/pin` - Pin/unpin a discussion

### Notification Endpoints

- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/count` - Get notification count
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `PUT /api/notifications/:id/read` - Mark a notification as read
- `DELETE /api/notifications/:id` - Delete a notification

### File Upload Endpoints

- `POST /api/upload/local` - Upload file to local storage
- `POST /api/upload/cloud` - Upload file to Cloudinary
- `POST /api/upload/local/multiple` - Upload multiple files locally
- `POST /api/upload/cloud/multiple` - Upload multiple files to Cloudinary

### Job Search Endpoints

- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get a single job
- `POST /api/jobs` - Create a job listing (Teacher/Admin only)
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job
- `POST /api/jobs/:id/apply` - Apply for a job (Student only)
- `GET /api/jobs/applications` - Get student's applications
- `GET /api/jobs/:id/applications` - Get job applications
- `PUT /api/jobs/:id/applications/:applicationId` - Update application status

### Live Class Endpoints

- `GET /api/courses/:courseId/live-classes` - Get all live classes for a course
- `POST /api/courses/:courseId/live-classes/zoom` - Schedule a Zoom live class (Teacher/Admin only)
- `POST /api/courses/:courseId/live-classes/google-meet` - Schedule a Google Meet live class (Teacher/Admin only)
- `GET /api/live-classes/:id` - Get details of a specific live class
- `PUT /api/live-classes/:id` - Update a live class (Teacher/Admin only)
- `DELETE /api/live-classes/:id` - Cancel a live class (Teacher/Admin only)
- `PUT /api/live-classes/:id/start` - Start a live class (Teacher only)
- `PUT /api/live-classes/:id/end` - End a live class (Teacher only)
- `PUT /api/live-classes/:id/join` - Join a live class (records attendance)
- `PUT /api/live-classes/:id/leave` - Leave a live class (records attendance)
- `GET /api/live-classes/:id/recordings` - Get recordings for a Zoom class (Teacher/Admin only)
- `PUT /api/live-classes/:id/recording` - Add recording to a live class (Teacher/Admin only)
- `GET /api/live-classes/:id/attendance` - Get attendance for a live class (Teacher/Admin only)
- `GET /api/live-classes/student/upcoming` - Get upcoming live classes for a student
- `GET /api/live-classes/google/auth-url` - Get Google OAuth URL (Teacher/Admin only)
- `POST /api/live-classes/google/callback` - Handle Google OAuth callback (Teacher/Admin only)

## 📜 License

[MIT License](LICENSE)

## 🌟 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# Notes Management System

## Usage Instructions

### For Teachers

#### Uploading Study Materials

To upload new notes or study materials, use the following endpoint:

```http
POST /api/courses/:courseId/notes
```

Required fields:

- `title`: Title of the study material
- `description`: Brief description of the content
- `topic`: The topic or module this material belongs to
- `file`: The file to upload (PDF, DOC, PPT, etc.)

Optional fields:

- `tags`: Comma-separated tags for better searchability
- `visibility`: Access level - "public", "enrolled_students" (default), or "private"

#### Managing Study Materials

Teachers can view all their uploaded materials:

```http
GET /api/notes/teacher
```

To update study materials:

```http
PUT /api/notes/:id
```

To delete study materials:

```http
DELETE /api/notes/:id
```

### For Students

#### Browsing Materials

To view all study materials for a course:

```http
GET /api/courses/:courseId/notes
```

Filtering options:

- `topic`: Filter by specific topic
- `fileType`: Filter by file type (pdf, doc, ppt, etc.)
- `search`: Search by title, description, or tags
- `sort`: Sort by various criteria (date, title, popularity)

#### Searching Across Courses

To search for study materials across all enrolled courses:

```http
GET /api/notes/search?search=your_search_term
```

Additional filters can be applied to the search:

- `topic`: Filter by specific topic
- `fileType`: Filter by file type

#### Accessing Materials

To view and download a specific study material:

```http
GET /api/notes/:id
```

## Implementation Details

The system features:

- Text indexing for fast, accurate searches
- Efficient file categorization for better organization
- Access control based on course enrollment and visibility settings
- Integration with Cloudinary for reliable file storage
- Automatic file type detection and validation
- Download tracking for usage analytics

# Assignment System

The assignment system allows teachers to create, manage, and grade assignments, while students can view and submit their work.

## Features

- Teachers can upload assignments with detailed instructions, deadlines, and file attachments
- Students can submit assignments with either text content or PDF/file uploads
- Automatic detection of late submissions
- Comprehensive feedback and grading system
- File storage via Cloudinary for reliable access
- Notification system for new assignments, submissions, and grades

## Usage Instructions

### For Teachers

#### Creating an Assignment

To create a new assignment, use the following endpoint:

```http
POST /api/courses/:courseId/assignments
```

Required fields:

- `title`: The assignment title
- `description`: Brief description of the assignment
- `instructions`: Detailed instructions for completing the assignment
- `dueDate`: Deadline for submission (format: ISO 8601)
- `points`: Maximum points available for this assignment

Optional fields:

- `assignmentFiles`: Up to 5 file attachments (PDF, images, etc.)

#### Viewing Submissions

To view all assignments for a course:

```http
GET /api/courses/:courseId/assignments
```

To view a specific assignment with its submissions:

```http
GET /api/assignments/:id
```

#### Grading Submissions

To grade a student's submission:

```http
POST /api/assignments/:id/grade/:submissionId
```

Required fields:

- `score`: Numerical score (between 0 and maximum points)
- `feedback`: Detailed feedback on the submission

### For Students

#### Viewing Assignments

To view all assignments across enrolled courses:

```http
GET /api/assignments/student
```

To view a specific assignment:

```http
GET /api/assignments/:id
```

#### Submitting Assignments

To submit an assignment:

```http
POST /api/assignments/:id/submit
```

You can provide either or both:

- `submissionText`: Text content for your submission
- `submissionFile`: File upload (PDF, doc, etc.)

The system will automatically detect if your submission is late based on the assignment's due date.

## Implementation Details

The system uses Cloudinary for file storage, allowing:

- Secure upload and storage of assignment materials
- Easy access to submission files
- Automatic file type validation
- Cleanup of old files when submissions are updated
