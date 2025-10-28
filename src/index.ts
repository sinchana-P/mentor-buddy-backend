import express, { Request, Response, NextFunction } from "express";
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

// Manual CORS handling for better control
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow localhost in development, or check against production origins
  if (origin) {
    if (process.env.NODE_ENV !== 'production') {
      // In development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    } else {
      // In production, check against allowed origins
      const allowedOrigins = typeof corsOrigins === 'boolean' ? [] : corsOrigins;
      if (corsOrigins === true || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-app-name,x-app-id,x-request-signature,x-user-id');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// CORS debugging middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && req.path.startsWith('/api')) {
    console.log(`CORS: ${req.method} ${req.path} from origin: ${origin}`);
  }
  next();
});

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

// Test endpoint to check if logging works
app.get("/api/test", (req, res) => {
  console.log('[TEST] Test endpoint hit!');
  res.json({ message: "Test endpoint works", timestamp: new Date().toISOString() });
});

// Debug endpoint to test database connection and mentors table
app.get("/api/debug/db", async (req, res) => {
  try {
    console.log('Debug: Bypassing timeout and testing simple queries...');
    
    // Use the existing database connection from our storage
    const { storage } = await import("./lib/storage.ts");
    
    // Test if we can get all users first (simpler query)
    console.log('Testing getAllUsers...');
    const users = await storage.getAllUsers();
    console.log('Users found:', users.length);
    
    // Test mentor query directly
    console.log('Testing getMentors directly...');
    const mentors = await storage.getMentors({ status: 'all' });
    console.log('Mentors found:', mentors.length);
    
    // Test getAllMentors
    console.log('Testing getAllMentors...');
    const allMentors = await storage.getAllMentors();
    console.log('AllMentors found:', allMentors.length);
    
    res.json({ 
      dbConnected: true,
      usersCount: users.length,
      mentorsCount: mentors.length,
      allMentorsCount: allMentors.length,
      sampleUsers: users.slice(0, 3).map(u => ({ id: u.id, email: u.email, role: u.role })),
      sampleMentors: mentors.slice(0, 3),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug: Storage test failed:', error);
    res.status(500).json({ 
      error: error.message,
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

// Import middleware only (controllers will be loaded dynamically)
import { authenticateToken, requireManager, requireMentor, requireBuddy } from "./middleware/auth.ts";

// Authentication routes (public)
app.post("/api/auth/login", async (req, res, next) => {
  console.log('[ROUTE] Login route hit with body:', req.body);
  try {
    const { login } = await import("./controllers/authController.ts");
    await login(req, res, next);
  } catch (error) {
    console.error('[ERROR] Login route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { register } = await import("./controllers/authController.ts");
    await register(req, res, next);
  } catch (error) {
    console.error('[ERROR] Register route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout requires authentication to blacklist token
app.post("/api/auth/logout", authenticateToken, async (req, res, next) => {
  try {
    const { logout } = await import("./controllers/authController.ts");
    await logout(req, res, next);
  } catch (error) {
    console.error('[ERROR] Logout route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Authentication routes (protected)
app.get("/api/auth/me", authenticateToken, async (req, res, next) => {
  try {
    const { getCurrentUser } = await import("./controllers/authController.ts");
    await getCurrentUser(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get current user route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/auth/change-password", authenticateToken, async (req, res, next) => {
  try {
    const { changePassword } = await import("./controllers/authController.ts");
    await changePassword(req, res, next);
  } catch (error) {
    console.error('[ERROR] Change password route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/auth/role", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { updateUserRole } = await import("./controllers/authController.ts");
    await updateUserRole(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update user role route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User routes (Manager only for most operations)
app.get("/api/users", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { getAllUsers } = await import("./controllers/userController.ts");
    await getAllUsers(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get all users route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/users/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getUserById } = await import("./controllers/userController.ts");
    await getUserById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get user by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/users/:id", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { updateUser } = await import("./controllers/userController.ts");
    await updateUser(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update user route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/users/:id", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { deleteUser } = await import("./controllers/userController.ts");
    await deleteUser(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete user route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mentor routes
app.get("/api/mentors", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    console.log('[ROUTE] /api/mentors route hit, importing controller...');
    const { getAllMentors } = await import("./controllers/mentorController.ts");
    console.log('[ROUTE] Controller imported, calling getAllMentors...');
    await getAllMentors(req, res, next);
    console.log('[ROUTE] getAllMentors call completed');
  } catch (error) {
    console.error('[ERROR] Get all mentors route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/mentors/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getMentorById } = await import("./controllers/mentorController.ts");
    await getMentorById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get mentor by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/mentors", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { createMentor } = await import("./controllers/mentorController.ts");
    await createMentor(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create mentor route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/mentors/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateMentor } = await import("./controllers/mentorController.ts");
    await updateMentor(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update mentor route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/mentors/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateMentor } = await import("./controllers/mentorController.ts");
    await updateMentor(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update mentor route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/mentors/:id", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { deleteMentor } = await import("./controllers/mentorController.ts");
    await deleteMentor(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete mentor route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/mentors/:id/buddies", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { getMentorBuddies } = await import("./controllers/mentorController.ts");
    await getMentorBuddies(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get mentor buddies route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Buddy routes
app.get("/api/buddies", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { getAllBuddies } = await import("./controllers/buddyController.ts");
    await getAllBuddies(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get all buddies route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test route to verify Express route registration
app.get("/api/buddies/test-route-works", (req, res) => {
  res.json({ message: "Test route works!" });
});

// Buddy Topics route - MUST come BEFORE /api/buddies/:id to avoid being shadowed
app.get("/api/buddies/:id/topics", authenticateToken, requireBuddy, async (req, res, next) => {
  console.log('[ROUTE HIT] /api/buddies/:id/topics -  ID:', req.params.id);
  try {
    const { getBuddyTopics } = await import("./controllers/buddyController.ts");
    await getBuddyTopics(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy topics route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyById } = await import("./controllers/buddyController.ts");
    await getBuddyById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/buddies", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { createBuddy } = await import("./controllers/buddyController.ts");
    await createBuddy(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create buddy route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/buddies/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateBuddy } = await import("./controllers/buddyController.ts");
    await updateBuddy(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update buddy route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/buddies/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateBuddy } = await import("./controllers/buddyController.ts");
    await updateBuddy(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update buddy route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/buddies/:id", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { deleteBuddy } = await import("./controllers/buddyController.ts");
    await deleteBuddy(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete buddy route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:id/tasks", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyTasks } = await import("./controllers/buddyController.ts");
    await getBuddyTasks(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy tasks route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:id/progress", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyProgress } = await import("./controllers/buddyController.ts");
    await getBuddyProgress(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy progress route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/buddies/:buddyId/progress/:topicId", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { updateBuddyProgress } = await import("./controllers/buddyController.ts");
    await updateBuddyProgress(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update buddy progress route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/buddies/:buddyId/progress/:topicId", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { updateBuddyProgress } = await import("./controllers/buddyController.ts");
    await updateBuddyProgress(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update buddy progress route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:id/portfolio", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyPortfolio } = await import("./controllers/buddyController.ts");
    await getBuddyPortfolio(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy portfolio route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/buddies/:id/assign-mentor", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { assignBuddyToMentor } = await import("./controllers/buddyController.ts");
    await assignBuddyToMentor(req, res, next);
  } catch (error) {
    console.error('[ERROR] Assign buddy to mentor route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update buddy topic by ID (separate route pattern)
app.patch("/api/buddy-topics/:topicId", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { updateBuddyTopicById } = await import("./controllers/buddyController.ts");
    await updateBuddyTopicById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update buddy topic route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Task routes
app.get("/api/tasks", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getAllTasks } = await import("./controllers/taskController.ts");
    await getAllTasks(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get all tasks route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/tasks/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTaskById } = await import("./controllers/taskController.ts");
    await getTaskById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get task by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/tasks", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createTask } = await import("./controllers/taskController.ts");
    await createTask(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/tasks/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateTask } = await import("./controllers/taskController.ts");
    await updateTask(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/tasks/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateTask } = await import("./controllers/taskController.ts");
    await updateTask(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/tasks/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteTask } = await import("./controllers/taskController.ts");
    await deleteTask(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete task route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/tasks/:id/submissions", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTaskSubmissions } = await import("./controllers/taskController.ts");
    await getTaskSubmissions(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get task submissions route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/tasks/:id/submissions", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { createSubmission } = await import("./controllers/taskController.ts");
    await createSubmission(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Resource routes
app.get("/api/resources", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getAllResources } = await import("./controllers/resourceController.ts");
    await getAllResources(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get all resources route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/resources/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getResourceById } = await import("./controllers/resourceController.ts");
    await getResourceById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get resource by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/resources", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createResource } = await import("./controllers/resourceController.ts");
    await createResource(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create resource route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/resources/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateResource } = await import("./controllers/resourceController.ts");
    await updateResource(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update resource route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/resources/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateResource } = await import("./controllers/resourceController.ts");
    await updateResource(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update resource route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/resources/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteResource } = await import("./controllers/resourceController.ts");
    await deleteResource(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete resource route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

// Settings routes
app.patch("/api/settings/profile", authenticateToken, async (req, res) => {
  try {
    console.log('[ROUTE] Settings profile route hit, user:', req.user?.id || 'NO USER');
    const { updateProfile } = await import("./controllers/settingsController.ts");
    await updateProfile(req, res);
  } catch (error) {
    console.error('[ERROR] Update profile route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/settings/preferences", authenticateToken, async (req, res) => {
  try {
    const { updatePreferences } = await import("./controllers/settingsController.ts");
    await updatePreferences(req, res);
  } catch (error) {
    console.error('[ERROR] Update preferences route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/settings/privacy", authenticateToken, async (req, res, next) => {
  try {
    const { updatePrivacySettings } = await import("./controllers/settingsController.ts");
    await updatePrivacySettings(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update privacy settings route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/settings/export", authenticateToken, async (req, res, next) => {
  try {
    const { exportUserData } = await import("./controllers/settingsController.ts");
    await exportUserData(req, res, next);
  } catch (error) {
    console.error('[ERROR] Export user data route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/settings/account", authenticateToken, async (req, res, next) => {
  try {
    const { deleteAccount } = await import("./controllers/settingsController.ts");
    await deleteAccount(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete account route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Dashboard routes (Manager+ access)
app.get("/api/dashboard/stats", authenticateToken, requireMentor, async (req, res) => {
  try {
    console.log('[GET /api/dashboard/stats] Fetching dashboard statistics...');
    const { storage } = await import("./lib/storage.ts");
    const stats = await storage.getDashboardStats();
    
    console.log('[GET /api/dashboard/stats] Returning stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[GET /api/dashboard/stats] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/dashboard/activity", authenticateToken, requireMentor, async (req, res) => {
  try {
    console.log('[GET /api/dashboard/activity] Fetching recent activity...');
    const { storage } = await import("./lib/storage.ts");
    const activity = await storage.getRecentActivity();
    
    console.log('[GET /api/dashboard/activity] Returning activity:', activity.length, 'items');
    res.json(activity);
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
