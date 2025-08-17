import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration for production deployment
const defaultAllowedOrigins = [
  'https://mentor-buddy.vercel.app',
  'https://mentor-buddy-panel.vercel.app',
  'https://mentor-buddy-panel-123.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000'
];

// Parse CORS_ORIGIN environment variable (can be comma-separated string or array)
const getCorsOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return typeof process.env.CORS_ORIGIN === 'string' 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : process.env.CORS_ORIGIN;
  }
  return process.env.NODE_ENV === 'production' ? defaultAllowedOrigins : true;
};

const corsOrigins = getCorsOrigins();

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0"
  });
});

// Debug endpoint to test database connection
app.get("/api/debug/db", async (req, res) => {
  try {
    console.log('Debug: Testing database connection...');
    const { testConnection } = await import("./lib/database.js");
    const connected = await testConnection();
    res.json({ 
      dbConnected: connected,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
    });
  } catch (error) {
    console.error('Debug: Database test failed:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      dbConnected: false 
    });
  }
});

// Debug endpoint to test storage import
app.get("/api/debug/storage", async (req, res) => {
  try {
    console.log('Debug: Testing storage import...');
    const { storage } = await import("./lib/storage.js");
    res.json({ 
      storageImported: true,
      storageType: typeof storage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug: Storage import failed:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      storageImported: false 
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Mentor Buddy Panel API",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Import API routes
import * as authController from "./controllers/authController.js";
import * as userController from "./controllers/userController.js";
import * as mentorController from "./controllers/mentorController.js";
import * as buddyController from "./controllers/buddyController.js";
import * as taskController from "./controllers/taskController.js";
import * as resourceController from "./controllers/resourceController.js";
import * as curriculumController from "./controllers/curriculumController.js";
import * as topicController from "./controllers/topicController.js";

// Authentication routes
app.post("/api/auth/login", authController.login);
app.post("/api/auth/register", authController.register);
app.get("/api/auth/me", authController.getCurrentUser);
app.put("/api/auth/role", authController.updateUserRole);

// User routes
app.get("/api/users", userController.getAllUsers);
app.get("/api/users/:id", userController.getUserById);
app.put("/api/users/:id", userController.updateUser);
app.delete("/api/users/:id", userController.deleteUser);

// Mentor routes
app.get("/api/mentors", mentorController.getAllMentors);
app.get("/api/mentors/:id", mentorController.getMentorById);
app.post("/api/mentors", mentorController.createMentor);
app.put("/api/mentors/:id", mentorController.updateMentor);
app.patch("/api/mentors/:id", mentorController.updateMentor); // Add PATCH support
app.delete("/api/mentors/:id", mentorController.deleteMentor);
app.get("/api/mentors/:id/buddies", mentorController.getMentorBuddies);

// Buddy routes
app.get("/api/buddies", buddyController.getAllBuddies);
app.get("/api/buddies/:id", buddyController.getBuddyById);
app.post("/api/buddies", buddyController.createBuddy);
app.put("/api/buddies/:id", buddyController.updateBuddy);
app.patch("/api/buddies/:id", buddyController.updateBuddy); // Add PATCH support
app.delete("/api/buddies/:id", buddyController.deleteBuddy);
app.get("/api/buddies/:id/tasks", buddyController.getBuddyTasks);
app.get("/api/buddies/:id/progress", buddyController.getBuddyProgress);
app.put("/api/buddies/:buddyId/progress/:topicId", buddyController.updateBuddyProgress);
app.patch("/api/buddies/:buddyId/progress/:topicId", buddyController.updateBuddyProgress); // Add PATCH support
app.get("/api/buddies/:id/portfolio", buddyController.getBuddyPortfolio);
app.post("/api/buddies/:id/assign-mentor", buddyController.assignBuddyToMentor);

// Task routes
app.get("/api/tasks", taskController.getAllTasks);
app.get("/api/tasks/:id", taskController.getTaskById);
app.post("/api/tasks", taskController.createTask);
app.put("/api/tasks/:id", taskController.updateTask);
app.patch("/api/tasks/:id", taskController.updateTask); // Add PATCH support
app.delete("/api/tasks/:id", taskController.deleteTask);
app.get("/api/tasks/:id/submissions", taskController.getTaskSubmissions);
app.post("/api/tasks/:id/submissions", taskController.createSubmission);

// Resource routes
app.get("/api/resources", resourceController.getAllResources);
app.get("/api/resources/:id", resourceController.getResourceById);
app.post("/api/resources", resourceController.createResource);
app.put("/api/resources/:id", resourceController.updateResource);
app.patch("/api/resources/:id", resourceController.updateResource); // Add PATCH support
app.delete("/api/resources/:id", resourceController.deleteResource);

// Curriculum routes
app.get("/api/curriculum", curriculumController.getAllCurriculum);
app.get("/api/curriculum/:id", curriculumController.getCurriculumById);
app.post("/api/curriculum", curriculumController.createCurriculum);
app.put("/api/curriculum/:id", curriculumController.updateCurriculum);
app.delete("/api/curriculum/:id", curriculumController.deleteCurriculum);

// Topic routes
app.get("/api/topics", topicController.getAllTopics);
app.get("/api/topics/:id", topicController.getTopicById);
app.post("/api/topics", topicController.createTopic);
app.put("/api/topics/:id", topicController.updateTopic);
app.delete("/api/topics/:id", topicController.deleteTopic);

// Dashboard routes
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const { storage } = await import("./lib/storage.js");
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/dashboard/activity", async (req, res) => {
  try {
    const { storage } = await import("./lib/storage.js");
    const activity = await storage.getRecentActivity();
    res.json(activity);
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(`Error: ${status} - ${message}`);
});

// Start server without database dependency for now
console.log('🚀 Starting Mentor Buddy Backend...');

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server is running on port ${port}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origins: ${JSON.stringify(corsOrigins)}`);
});
