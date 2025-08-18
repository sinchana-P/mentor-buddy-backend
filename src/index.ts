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
    const { testConnection } = await import("./lib/database.ts");
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
    const { storage } = await import("./lib/storage.ts");
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

// Import API routes and middleware
import * as authController from "./controllers/authController.ts";
import * as userController from "./controllers/userController.ts";
// Import controllers
import * as mentorController from "./controllers/mentorController.ts";
import * as buddyController from "./controllers/buddyController.ts";
import * as taskController from "./controllers/taskController.ts";
import * as resourceController from "./controllers/resourceController.ts";
// import * as curriculumController from "./controllers/curriculumController.ts";
// import * as topicController from "./controllers/topicController.ts";
import { authenticateToken, requireManager, requireMentor, requireBuddy } from "./middleware/auth.ts";

// Authentication routes (public)
app.post("/api/auth/login", (req, res, next) => {
  console.log('[ROUTE] Login route hit with body:', req.body);
  next();
}, authController.login);
app.post("/api/auth/register", authController.register);

// Logout requires authentication to blacklist token
app.post("/api/auth/logout", authenticateToken, authController.logout);

// Authentication routes (protected)
app.get("/api/auth/me", authenticateToken, authController.getCurrentUser);
app.post("/api/auth/change-password", authenticateToken, authController.changePassword);
app.put("/api/auth/role", authenticateToken, requireManager, authController.updateUserRole);

// User routes (Manager only for most operations)
app.get("/api/users", authenticateToken, requireManager, userController.getAllUsers);
app.get("/api/users/:id", authenticateToken, requireBuddy, userController.getUserById); // All authenticated users can view
app.put("/api/users/:id", authenticateToken, requireManager, userController.updateUser);
app.delete("/api/users/:id", authenticateToken, requireManager, userController.deleteUser);

// Mentor routes
app.get("/api/mentors", authenticateToken, requireBuddy, mentorController.getAllMentors); // All can view mentors
app.get("/api/mentors/:id", authenticateToken, requireBuddy, mentorController.getMentorById);
app.post("/api/mentors", authenticateToken, requireManager, mentorController.createMentor); // Manager only
app.put("/api/mentors/:id", authenticateToken, requireMentor, mentorController.updateMentor); // Mentor+ can update
app.patch("/api/mentors/:id", authenticateToken, requireMentor, mentorController.updateMentor);
app.delete("/api/mentors/:id", authenticateToken, requireManager, mentorController.deleteMentor); // Manager only
app.get("/api/mentors/:id/buddies", authenticateToken, requireMentor, mentorController.getMentorBuddies);

// Buddy routes
app.get("/api/buddies", authenticateToken, requireMentor, buddyController.getAllBuddies); // Mentor+ can view all
app.get("/api/buddies/:id", authenticateToken, requireBuddy, buddyController.getBuddyById); // All can view specific buddy
app.post("/api/buddies", authenticateToken, requireManager, buddyController.createBuddy); // Manager only
app.put("/api/buddies/:id", authenticateToken, requireMentor, buddyController.updateBuddy); // Mentor+ can update
app.patch("/api/buddies/:id", authenticateToken, requireMentor, buddyController.updateBuddy);
app.delete("/api/buddies/:id", authenticateToken, requireManager, buddyController.deleteBuddy); // Manager only
app.get("/api/buddies/:id/tasks", authenticateToken, requireBuddy, buddyController.getBuddyTasks);
app.get("/api/buddies/:id/progress", authenticateToken, requireBuddy, buddyController.getBuddyProgress);
app.put("/api/buddies/:buddyId/progress/:topicId", authenticateToken, requireBuddy, buddyController.updateBuddyProgress);
app.patch("/api/buddies/:buddyId/progress/:topicId", authenticateToken, requireBuddy, buddyController.updateBuddyProgress);
app.get("/api/buddies/:id/portfolio", authenticateToken, requireBuddy, buddyController.getBuddyPortfolio);
app.post("/api/buddies/:id/assign-mentor", authenticateToken, requireManager, buddyController.assignBuddyToMentor);

// Task routes
app.get("/api/tasks", authenticateToken, requireBuddy, taskController.getAllTasks); // All can view tasks
app.get("/api/tasks/:id", authenticateToken, requireBuddy, taskController.getTaskById);
app.post("/api/tasks", authenticateToken, requireMentor, taskController.createTask); // Mentor+ can create
app.put("/api/tasks/:id", authenticateToken, requireMentor, taskController.updateTask);
app.patch("/api/tasks/:id", authenticateToken, requireMentor, taskController.updateTask);
app.delete("/api/tasks/:id", authenticateToken, requireMentor, taskController.deleteTask);
app.get("/api/tasks/:id/submissions", authenticateToken, requireBuddy, taskController.getTaskSubmissions);
app.post("/api/tasks/:id/submissions", authenticateToken, requireBuddy, taskController.createSubmission);

// Resource routes
app.get("/api/resources", authenticateToken, requireBuddy, resourceController.getAllResources); // All can view
app.get("/api/resources/:id", authenticateToken, requireBuddy, resourceController.getResourceById);
app.post("/api/resources", authenticateToken, requireMentor, resourceController.createResource); // Mentor+ can create
app.put("/api/resources/:id", authenticateToken, requireMentor, resourceController.updateResource);
app.patch("/api/resources/:id", authenticateToken, requireMentor, resourceController.updateResource);
app.delete("/api/resources/:id", authenticateToken, requireMentor, resourceController.deleteResource);

// TEMPORARILY COMMENTED OUT - Database connection issues
// Curriculum routes
// app.get("/api/curriculum", authenticateToken, requireBuddy, curriculumController.getAllCurriculum); // All can view
// app.get("/api/curriculum/:id", authenticateToken, requireBuddy, curriculumController.getCurriculumById);
// app.post("/api/curriculum", authenticateToken, requireMentor, curriculumController.createCurriculum); // Mentor+ can create
// app.put("/api/curriculum/:id", authenticateToken, requireMentor, curriculumController.updateCurriculum);
// app.delete("/api/curriculum/:id", authenticateToken, requireMentor, curriculumController.deleteCurriculum);

// Topic routes
// app.get("/api/topics", authenticateToken, requireBuddy, topicController.getAllTopics); // All can view
// app.get("/api/topics/:id", authenticateToken, requireBuddy, topicController.getTopicById);
// app.post("/api/topics", authenticateToken, requireMentor, topicController.createTopic); // Mentor+ can create
// app.put("/api/topics/:id", authenticateToken, requireMentor, topicController.updateTopic);
// app.delete("/api/topics/:id", authenticateToken, requireMentor, topicController.deleteTopic);

// Dashboard routes (Manager+ access)
app.get("/api/dashboard/stats", authenticateToken, requireMentor, async (req, res) => {
  try {
    console.log('[GET /api/dashboard/stats] Fetching dashboard statistics...');
    
    // For now, return mock data while database setup is in progress
    const mockStats = {
      totalMentors: 8,
      totalBuddies: 24,
      activeTasks: 12,
      completedTasks: 45,
      completionRate: 79
    };
    
    console.log('[GET /api/dashboard/stats] Returning mock stats:', mockStats);
    res.json(mockStats);
  } catch (error) {
    console.error('[GET /api/dashboard/stats] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/dashboard/activity", authenticateToken, requireMentor, async (req, res) => {
  try {
    console.log('[GET /api/dashboard/activity] Fetching recent activity...');
    
    // For now, return mock data while database setup is in progress
    const mockActivity = [
      {
        id: '1',
        type: 'task_assigned',
        message: 'John Doe assigned "React Components" to Sarah Wilson',
        timestamp: new Date().toISOString(),
        status: 'in_progress'
      },
      {
        id: '2',
        type: 'task_completed',
        message: 'Mike Johnson completed "Node.js API Development"',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'completed'
      },
      {
        id: '3',
        type: 'buddy_assigned',
        message: 'Emma Davis was assigned to mentor Alice Cooper',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'active'
      }
    ];
    
    console.log('[GET /api/dashboard/activity] Returning mock activity:', mockActivity.length, 'items');
    res.json(mockActivity);
  } catch (error) {
    console.error('[GET /api/dashboard/activity] Error:', error);
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
