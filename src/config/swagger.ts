import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Mentor Buddy API',
    version: '1.0.0',
    description: 'Comprehensive mentorship management platform API documentation',
    contact: {
      name: 'Mentor Buddy Team',
      email: 'support@mentorbuddy.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://mentor-buddy-backend.onrender.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['manager', 'mentor', 'buddy'] },
          domainRole: { type: 'string', enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Mentor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          expertise: { type: 'string' },
          bio: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Buddy: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          assignedMentorId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'inactive', 'exited'] },
          curriculumId: { type: 'string', format: 'uuid' },
          progress: { type: 'object' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Curriculum: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          domainRole: { type: 'string', enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'] },
          totalWeeks: { type: 'integer' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          version: { type: 'string' },
          weeks: { type: 'array', items: { type: 'object' } },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          assignedBy: { type: 'string', format: 'uuid' },
          assignedTo: { type: 'string', format: 'uuid' },
          curriculumId: { type: 'string', format: 'uuid' },
          weekNumber: { type: 'integer' },
          status: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
      Submission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          taskId: { type: 'string', format: 'uuid' },
          buddyId: { type: 'string', format: 'uuid' },
          githubUrl: { type: 'string' },
          liveUrl: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          feedback: { type: 'string' },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
      Resource: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['documentation', 'video', 'article', 'course', 'tool'] },
          category: { type: 'string' },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          url: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number' },
        },
      },
      Portfolio: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          buddyId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          githubUrl: { type: 'string' },
          liveUrl: { type: 'string' },
          imageUrl: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management (Manager only)' },
    { name: 'Mentors', description: 'Mentor management' },
    { name: 'Buddies', description: 'Buddy management' },
    { name: 'Curriculum', description: 'Curriculum management' },
    { name: 'Tasks', description: 'Task management' },
    { name: 'Submissions', description: 'Task submission management' },
    { name: 'Resources', description: 'Learning resources' },
    { name: 'Portfolios', description: 'Buddy portfolios' },
    { name: 'Dashboard', description: 'Dashboard statistics' },
    { name: 'Settings', description: 'User settings and preferences' },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/index.ts'], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
