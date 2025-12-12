import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration for production deployment
const defaultAllowedOrigins = [
  'https://mentor-buddy.vercel.app',
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

// Increase body size limit to support base64 file uploads (10MB files become ~13MB base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));


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

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Mentor Buddy API Documentation",
  customfavIcon: "/favicon.ico"
}));

// Swagger JSON endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
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

app.post("/api/users", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { createUser } = await import("./controllers/userController.ts");
    await createUser(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create user route error:', error);
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

app.patch("/api/users/:id", authenticateToken, requireManager, async (req, res, next) => {
  try {
    const { updateUser } = await import("./controllers/userController.ts");
    await updateUser(req, res, next);
  } catch (error) {
    console.error('[ERROR] Patch user route error:', error);
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
app.get("/api/buddies", authenticateToken, requireBuddy, async (req, res, next) => {
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

app.post("/api/buddies", authenticateToken, requireMentor, async (req, res, next) => {
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

app.delete("/api/buddies/:id", authenticateToken, requireMentor, async (req, res, next) => {
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

// Portfolio CRUD routes
app.post("/api/buddies/:buddyId/portfolio", authenticateToken, requireBuddy, async (req, res) => {
  try {
    const { createPortfolio } = await import("./controllers/portfolioController.ts");
    await createPortfolio(req, res);
  } catch (error) {
    console.error('[ERROR] Create portfolio route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:buddyId/portfolios", authenticateToken, requireBuddy, async (req, res) => {
  try {
    const { getPortfoliosByBuddyId } = await import("./controllers/portfolioController.ts");
    await getPortfoliosByBuddyId(req, res);
  } catch (error) {
    console.error('[ERROR] Get portfolios route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/portfolios/:id", authenticateToken, requireBuddy, async (req, res) => {
  try {
    const { updatePortfolio } = await import("./controllers/portfolioController.ts");
    await updatePortfolio(req, res);
  } catch (error) {
    console.error('[ERROR] Update portfolio route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/portfolios/:id", authenticateToken, requireBuddy, async (req, res) => {
  try {
    const { deletePortfolio } = await import("./controllers/portfolioController.ts");
    await deletePortfolio(req, res);
  } catch (error) {
    console.error('[ERROR] Delete portfolio route error:', error);
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

// Alias endpoint for frontend compatibility - PATCH /api/buddies/:id/assign
app.patch("/api/buddies/:id/assign", authenticateToken, requireManager, async (req, res, next) => {
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
// Curriculum routes (OLD - replaced by Curriculum Management System below)
// app.get("/api/curriculum", authenticateToken, requireBuddy, curriculumController.getAllCurriculum); // All can view
// app.get("/api/curriculum/:id", authenticateToken, requireBuddy, curriculumController.getCurriculumById);
// app.post("/api/curriculum", authenticateToken, requireMentor, curriculumController.createCurriculum); // Mentor+ can create
// app.put("/api/curriculum/:id", authenticateToken, requireMentor, curriculumController.updateCurriculum);
// app.delete("/api/curriculum/:id", authenticateToken, requireMentor, curriculumController.deleteCurriculum);

// ═══════════════════════════════════════════════════════════
// CURRICULUM MANAGEMENT SYSTEM (NEW)
// ═══════════════════════════════════════════════════════════

// Curriculums (Admin: Managers & Mentors)
app.get("/api/curriculums", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getAllCurriculums } = await import("./controllers/curriculumManagementController.ts");
    await getAllCurriculums(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get curriculums route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/curriculums/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getCurriculumById } = await import("./controllers/curriculumManagementController.ts");
    await getCurriculumById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get curriculum by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/curriculums", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createCurriculum } = await import("./controllers/curriculumManagementController.ts");
    await createCurriculum(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create curriculum route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/curriculums/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateCurriculum } = await import("./controllers/curriculumManagementController.ts");
    await updateCurriculum(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update curriculum route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/curriculums/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteCurriculum } = await import("./controllers/curriculumManagementController.ts");
    await deleteCurriculum(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete curriculum route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/curriculums/:id/publish", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { publishCurriculum } = await import("./controllers/curriculumManagementController.ts");
    await publishCurriculum(req, res, next);
  } catch (error) {
    console.error('[ERROR] Publish curriculum route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all submissions for a curriculum (Mentor/Manager view)
app.get("/api/curriculums/:id/submissions", authenticateToken, requireMentor, async (req, res) => {
  try {
    const { getCurriculumSubmissions } = await import("./controllers/curriculumManagementController.ts");
    await getCurriculumSubmissions(req, res);
  } catch (error) {
    console.error('[ERROR] Get curriculum submissions route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Curriculum Weeks (Admin only)
app.get("/api/curriculums/:id/weeks", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getCurriculumWeeks } = await import("./controllers/curriculumManagementController.ts");
    await getCurriculumWeeks(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get curriculum weeks route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/curriculums/:id/weeks", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createCurriculumWeek } = await import("./controllers/curriculumManagementController.ts");
    await createCurriculumWeek(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create curriculum week route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/weeks/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateCurriculumWeek } = await import("./controllers/curriculumManagementController.ts");
    await updateCurriculumWeek(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update curriculum week route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/weeks/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteCurriculumWeek } = await import("./controllers/curriculumManagementController.ts");
    await deleteCurriculumWeek(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete curriculum week route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Task Templates (Admin only)
app.get("/api/weeks/:id/tasks", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getWeekTasks } = await import("./controllers/curriculumManagementController.ts");
    await getWeekTasks(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get week tasks route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/task-templates/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTaskTemplateById } = await import("./controllers/curriculumManagementController.ts");
    await getTaskTemplateById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get task template by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/weeks/:id/tasks", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createTaskTemplate } = await import("./controllers/curriculumManagementController.ts");
    await createTaskTemplate(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create task template route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/task-templates/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateTaskTemplate } = await import("./controllers/curriculumManagementController.ts");
    await updateTaskTemplate(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update task template route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/task-templates/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteTaskTemplate } = await import("./controllers/curriculumManagementController.ts");
    await deleteTaskTemplate(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete task template route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// BUDDY CURRICULUM ROUTES
// ═══════════════════════════════════════════════════════════

app.get("/api/buddies/:id/curriculum", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyCurriculum } = await import("./controllers/curriculumManagementController.ts");
    await getBuddyCurriculum(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy curriculum route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/buddies/:id/assignments", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getBuddyAssignments } = await import("./controllers/curriculumManagementController.ts");
    await getBuddyAssignments(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get buddy assignments route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// TASK ASSIGNMENT ROUTES
// ═══════════════════════════════════════════════════════════

app.get("/api/task-assignments/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTaskAssignmentById } = await import("./controllers/submissionController.ts");
    await getTaskAssignmentById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get task assignment route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/task-assignments/:id/start", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { startTaskAssignment } = await import("./controllers/submissionController.ts");
    await startTaskAssignment(req, res, next);
  } catch (error) {
    console.error('[ERROR] Start task assignment route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/task-assignments/:id/submit", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { submitTaskAssignment } = await import("./controllers/submissionController.ts");
    await submitTaskAssignment(req, res, next);
  } catch (error) {
    console.error('[ERROR] Submit task assignment route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/task-assignments/:id/submissions", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTaskAssignmentSubmissions } = await import("./controllers/submissionController.ts");
    await getTaskAssignmentSubmissions(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get task assignment submissions route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// SUBMISSION ROUTES
// ═══════════════════════════════════════════════════════════

app.get("/api/submissions/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getSubmissionById } = await import("./controllers/submissionController.ts");
    await getSubmissionById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/submissions/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { updateSubmission } = await import("./controllers/submissionController.ts");
    await updateSubmission(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/submissions/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { deleteSubmission } = await import("./controllers/submissionController.ts");
    await deleteSubmission(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// REVIEW ROUTES (Mentor/Manager)
// ═══════════════════════════════════════════════════════════

app.post("/api/submissions/:id/approve", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { approveSubmission } = await import("./controllers/submissionController.ts");
    await approveSubmission(req, res, next);
  } catch (error) {
    console.error('[ERROR] Approve submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/submissions/:id/request-revision", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { requestRevision } = await import("./controllers/submissionController.ts");
    await requestRevision(req, res, next);
  } catch (error) {
    console.error('[ERROR] Request revision route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/submissions/:id/reject", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { rejectSubmission } = await import("./controllers/submissionController.ts");
    await rejectSubmission(req, res, next);
  } catch (error) {
    console.error('[ERROR] Reject submission route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// FEEDBACK ROUTES
// ═══════════════════════════════════════════════════════════

app.post("/api/submissions/:id/feedback", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { addFeedback } = await import("./controllers/submissionController.ts");
    await addFeedback(req, res, next);
  } catch (error) {
    console.error('[ERROR] Add feedback route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/submissions/:id/feedback", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getSubmissionFeedback } = await import("./controllers/submissionController.ts");
    await getSubmissionFeedback(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get submission feedback route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch("/api/feedback/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { updateFeedback } = await import("./controllers/submissionController.ts");
    await updateFeedback(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update feedback route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/feedback/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { deleteFeedback } = await import("./controllers/submissionController.ts");
    await deleteFeedback(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete feedback route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// MENTOR REVIEW QUEUE
// ═══════════════════════════════════════════════════════════

app.get("/api/mentors/:id/review-queue", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { getMentorReviewQueue } = await import("./controllers/submissionController.ts");
    await getMentorReviewQueue(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get mentor review queue route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/mentors/:id/assigned-buddies", authenticateToken, requireMentor, async (req, res) => {
  try {
    const { getMentorAssignedBuddies } = await import("./controllers/submissionController.ts");
    await getMentorAssignedBuddies(req, res);
  } catch (error) {
    console.error('[ERROR] Get mentor assigned buddies route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Topic routes
app.get("/api/topics", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getAllTopics } = await import("./controllers/topicController.ts");
    await getAllTopics(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get all topics route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/topics/:id", authenticateToken, requireBuddy, async (req, res, next) => {
  try {
    const { getTopicById } = await import("./controllers/topicController.ts");
    await getTopicById(req, res, next);
  } catch (error) {
    console.error('[ERROR] Get topic by ID route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/topics", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { createTopic } = await import("./controllers/topicController.ts");
    await createTopic(req, res, next);
  } catch (error) {
    console.error('[ERROR] Create topic route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put("/api/topics/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { updateTopic } = await import("./controllers/topicController.ts");
    await updateTopic(req, res, next);
  } catch (error) {
    console.error('[ERROR] Update topic route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete("/api/topics/:id", authenticateToken, requireMentor, async (req, res, next) => {
  try {
    const { deleteTopic } = await import("./controllers/topicController.ts");
    await deleteTopic(req, res, next);
  } catch (error) {
    console.error('[ERROR] Delete topic route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

// Dashboard routes (accessible to all authenticated users)
app.get("/api/dashboard/stats", authenticateToken, requireBuddy, async (req, res) => {
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

app.get("/api/dashboard/activity", authenticateToken, requireBuddy, async (req, res) => {
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
