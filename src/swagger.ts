export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mentor Buddy API',
    version: '1.0.0',
    description: `
      Comprehensive API documentation for the Mentor Buddy management system.

      ## Authentication
      Most endpoints require authentication using JWT Bearer tokens.
      After logging in, include the token in the Authorization header:
      \`Authorization: Bearer <your-token>\`

      ## Role-Based Access Control
      - **Manager**: Full access to all resources
      - **Mentor**: Can manage buddies, tasks, resources, and topics
      - **Buddy**: Can view and update their own progress and tasks
    `,
    contact: {
      name: 'API Support',
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
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management (Manager only)' },
    { name: 'Mentors', description: 'Mentor profile management' },
    { name: 'Buddies', description: 'Buddy profile and progress management' },
    { name: 'Tasks', description: 'Task assignment and submission' },
    { name: 'Resources', description: 'Learning resources management' },
    { name: 'Topics', description: 'Topic and curriculum management' },
    { name: 'Portfolio', description: 'Buddy portfolio management' },
    { name: 'Settings', description: 'User settings and preferences' },
    { name: 'Dashboard', description: 'Dashboard statistics and activity' },
    { name: 'Health', description: 'Health check and debugging endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token (obtained from /api/auth/login)',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message',
          },
          errors: {
            type: 'array',
            description: 'Validation errors',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },

      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User unique identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          role: {
            type: 'string',
            enum: ['manager', 'mentor', 'buddy'],
            description: 'User role in the system',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            description: 'User domain specialization',
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'User avatar URL',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },

      // Authentication schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
            description: 'User email address',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePass123!',
            description: 'User password',
          },
        },
      },

      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePass123!',
            minLength: 8,
          },
          name: {
            type: 'string',
            example: 'John Doe',
            minLength: 2,
          },
          role: {
            type: 'string',
            enum: ['manager', 'mentor', 'buddy'],
            example: 'buddy',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            example: 'frontend',
          },
        },
      },

      AuthResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Login successful',
          },
          token: {
            type: 'string',
            description: 'JWT authentication token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },

      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: {
            type: 'string',
            format: 'password',
          },
          newPassword: {
            type: 'string',
            format: 'password',
            minLength: 8,
          },
        },
      },

      // Mentor schemas
      Mentor: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          expertise: {
            type: 'string',
            description: 'Mentor technical expertise',
          },
          experience: {
            type: 'string',
            description: 'Mentor work experience',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether mentor is currently active',
          },
          bio: {
            type: 'string',
            nullable: true,
          },
          linkedinUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreateMentorRequest: {
        type: 'object',
        required: ['name', 'email', 'domainRole', 'expertise', 'experience'],
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            example: 'Jane Smith',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'jane.smith@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            default: 'defaultPassword123',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            example: 'frontend',
          },
          expertise: {
            type: 'string',
            minLength: 10,
            example: 'React, TypeScript, Node.js, System Design',
          },
          experience: {
            type: 'string',
            minLength: 10,
            example: '8 years of full-stack development experience',
          },
          bio: {
            type: 'string',
            nullable: true,
          },
          linkedinUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
        },
      },

      UpdateMentorRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
          },
          email: {
            type: 'string',
            format: 'email',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          expertise: {
            type: 'string',
            minLength: 10,
          },
          experience: {
            type: 'string',
            minLength: 10,
          },
          isActive: {
            type: 'boolean',
          },
          bio: {
            type: 'string',
            nullable: true,
          },
          linkedinUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
        },
      },

      // Buddy schemas
      Buddy: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          mentor: {
            $ref: '#/components/schemas/Mentor',
            nullable: true,
          },
          mentorId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'exited'],
          },
          progress: {
            type: 'number',
            format: 'float',
            minimum: 0,
            maximum: 100,
            description: 'Overall learning progress percentage',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreateBuddyRequest: {
        type: 'object',
        required: ['name', 'email', 'domainRole', 'assignedMentorId'],
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            example: 'Alice Johnson',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'alice.johnson@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            default: 'defaultPassword123',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            example: 'frontend',
          },
          assignedMentorId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the mentor to assign to this buddy',
          },
          topicIds: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Optional list of topic IDs to assign',
          },
        },
      },

      UpdateBuddyRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
          },
          email: {
            type: 'string',
            format: 'email',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'exited'],
          },
          assignedMentorId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
        },
      },

      AssignMentorRequest: {
        type: 'object',
        required: ['mentorId'],
        properties: {
          mentorId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the mentor to assign',
          },
        },
      },

      // Topic schemas
      Topic: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            description: 'Topic name',
          },
          description: {
            type: 'string',
            nullable: true,
          },
          category: {
            type: 'string',
            description: 'Topic category',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          orderIndex: {
            type: 'integer',
            description: 'Display order',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      BuddyTopic: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          topic: {
            $ref: '#/components/schemas/Topic',
          },
          checked: {
            type: 'boolean',
            description: 'Whether the topic is completed',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },

      UpdateProgressRequest: {
        type: 'object',
        required: ['checked'],
        properties: {
          checked: {
            type: 'boolean',
            description: 'Mark topic as completed or incomplete',
          },
        },
      },

      CreateTopicRequest: {
        type: 'object',
        required: ['name', 'category', 'domainRole'],
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            example: 'React Hooks',
          },
          description: {
            type: 'string',
            nullable: true,
          },
          category: {
            type: 'string',
            example: 'Frontend',
          },
          domainRole: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          orderIndex: {
            type: 'integer',
            minimum: 0,
          },
        },
      },

      // Task schemas
      Task: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'submitted', 'completed', 'rejected'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          assignedBy: {
            $ref: '#/components/schemas/Mentor',
          },
          assignedTo: {
            $ref: '#/components/schemas/Buddy',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreateTaskRequest: {
        type: 'object',
        required: ['title', 'description', 'assignedToId', 'priority'],
        properties: {
          title: {
            type: 'string',
            minLength: 3,
            example: 'Build React Todo App',
          },
          description: {
            type: 'string',
            minLength: 10,
            example: 'Create a todo app using React with CRUD operations',
          },
          assignedToId: {
            type: 'string',
            format: 'uuid',
            description: 'Buddy ID to assign the task to',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            example: 'high',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },

      UpdateTaskRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 3,
          },
          description: {
            type: 'string',
            minLength: 10,
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'submitted', 'completed', 'rejected'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },

      Submission: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          taskId: {
            type: 'string',
            format: 'uuid',
          },
          buddyId: {
            type: 'string',
            format: 'uuid',
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          deploymentUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          notes: {
            type: 'string',
            nullable: true,
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreateSubmissionRequest: {
        type: 'object',
        properties: {
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          deploymentUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          notes: {
            type: 'string',
            nullable: true,
          },
        },
      },

      // Resource schemas
      Resource: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          type: {
            type: 'string',
            enum: ['documentation', 'video', 'article', 'course', 'tool'],
          },
          category: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          url: {
            type: 'string',
            format: 'uri',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            nullable: true,
          },
          duration: {
            type: 'string',
            nullable: true,
          },
          author: {
            type: 'string',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreateResourceRequest: {
        type: 'object',
        required: ['title', 'description', 'type', 'category', 'url'],
        properties: {
          title: {
            type: 'string',
            example: 'React Official Documentation',
          },
          description: {
            type: 'string',
            example: 'Official React documentation for learning React',
          },
          type: {
            type: 'string',
            enum: ['documentation', 'video', 'article', 'course', 'tool'],
          },
          category: {
            type: 'string',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
          },
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://react.dev',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['react', 'javascript', 'frontend'],
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            nullable: true,
          },
          duration: {
            type: 'string',
            nullable: true,
            example: '2 hours',
          },
          author: {
            type: 'string',
            nullable: true,
            example: 'React Team',
          },
        },
      },

      // Portfolio schemas
      Portfolio: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          buddyId: {
            type: 'string',
            format: 'uuid',
          },
          projectName: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          technologies: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          liveUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      CreatePortfolioRequest: {
        type: 'object',
        required: ['projectName', 'description', 'technologies'],
        properties: {
          projectName: {
            type: 'string',
            example: 'E-commerce Website',
          },
          description: {
            type: 'string',
            example: 'Full-stack e-commerce application with payment integration',
          },
          technologies: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
          },
          githubUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          liveUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
          },
        },
      },

      // Dashboard schemas
      DashboardStats: {
        type: 'object',
        properties: {
          totalMentors: {
            type: 'integer',
          },
          activeMentors: {
            type: 'integer',
          },
          totalBuddies: {
            type: 'integer',
          },
          activeBuddies: {
            type: 'integer',
          },
          totalTasks: {
            type: 'integer',
          },
          completedTasks: {
            type: 'integer',
          },
          pendingTasks: {
            type: 'integer',
          },
          totalResources: {
            type: 'integer',
          },
        },
      },

      Activity: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          type: {
            type: 'string',
            enum: ['task_created', 'task_completed', 'buddy_joined', 'resource_added'],
          },
          description: {
            type: 'string',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          actor: {
            type: 'string',
            description: 'User who performed the action',
          },
        },
      },
    },
  },

  paths: {
    // Health check endpoints
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check if the API is running',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string', example: 'development' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Authentication endpoints
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and receive JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          400: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          400: {
            description: 'Validation error or email already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'User logout',
        description: 'Logout and blacklist the current JWT token',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Logout successful' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Get the currently authenticated user information',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change password',
        description: 'Change the current user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ChangePasswordRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed successfully',
          },
          400: {
            description: 'Invalid current password or validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
          },
        },
      },
    },

    // User endpoints
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Get all users',
        description: 'Retrieve list of all users (Manager only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
        },
      },
    },

    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'User ID',
          },
        ],
        responses: {
          200: {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          404: {
            description: 'User not found',
          },
        },
      },

      put: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Update user information (Manager only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['manager', 'mentor', 'buddy'] },
                  domainRole: { type: 'string', enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User updated successfully',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
          404: {
            description: 'User not found',
          },
        },
      },

      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Delete a user account (Manager only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'User deleted successfully',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
          404: {
            description: 'User not found',
          },
        },
      },
    },

    // Mentor endpoints
    '/api/mentors': {
      get: {
        tags: ['Mentors'],
        summary: 'Get all mentors',
        description: 'Retrieve list of all mentors with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            },
            description: 'Filter by domain role',
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'inactive'],
            },
            description: 'Filter by active status',
          },
          {
            name: 'search',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Search by name or expertise',
          },
        ],
        responses: {
          200: {
            description: 'Mentors retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Mentor',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Mentors'],
        summary: 'Create mentor',
        description: 'Create a new mentor profile (Manager only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateMentorRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Mentor created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Mentor',
                },
              },
            },
          },
          400: {
            description: 'Validation error',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
        },
      },
    },

    '/api/mentors/{id}': {
      get: {
        tags: ['Mentors'],
        summary: 'Get mentor by ID',
        description: 'Retrieve a specific mentor by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Mentor retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Mentor',
                },
              },
            },
          },
          404: {
            description: 'Mentor not found',
          },
        },
      },

      put: {
        tags: ['Mentors'],
        summary: 'Update mentor',
        description: 'Update mentor profile information',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateMentorRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Mentor updated successfully',
          },
          404: {
            description: 'Mentor not found',
          },
        },
      },

      patch: {
        tags: ['Mentors'],
        summary: 'Partial update mentor',
        description: 'Partially update mentor profile',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateMentorRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Mentor updated successfully',
          },
          404: {
            description: 'Mentor not found',
          },
        },
      },

      delete: {
        tags: ['Mentors'],
        summary: 'Delete mentor',
        description: 'Delete a mentor profile (Manager only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Mentor deleted successfully',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
          404: {
            description: 'Mentor not found',
          },
        },
      },
    },

    '/api/mentors/{id}/buddies': {
      get: {
        tags: ['Mentors'],
        summary: 'Get mentor buddies',
        description: 'Get all buddies assigned to a specific mentor',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Mentor ID',
          },
        ],
        responses: {
          200: {
            description: 'Buddies retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Buddy',
                  },
                },
              },
            },
          },
        },
      },
    },

    // Buddy endpoints
    '/api/buddies': {
      get: {
        tags: ['Buddies'],
        summary: 'Get all buddies',
        description: 'Retrieve list of all buddies with optional filters (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'exited'],
            },
            description: 'Filter by status',
          },
          {
            name: 'domain',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            },
            description: 'Filter by domain role',
          },
          {
            name: 'search',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Search by name',
          },
        ],
        responses: {
          200: {
            description: 'Buddies retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Buddy',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Buddies'],
        summary: 'Create buddy',
        description: 'Create a new buddy profile (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateBuddyRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Buddy created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Buddy',
                },
              },
            },
          },
          400: {
            description: 'Validation error',
          },
        },
      },
    },

    '/api/buddies/{id}': {
      get: {
        tags: ['Buddies'],
        summary: 'Get buddy by ID',
        description: 'Retrieve a specific buddy by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Buddy retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Buddy',
                },
              },
            },
          },
          404: {
            description: 'Buddy not found',
          },
        },
      },

      put: {
        tags: ['Buddies'],
        summary: 'Update buddy',
        description: 'Update buddy profile (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateBuddyRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Buddy updated successfully',
          },
          404: {
            description: 'Buddy not found',
          },
        },
      },

      patch: {
        tags: ['Buddies'],
        summary: 'Partial update buddy',
        description: 'Partially update buddy profile (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateBuddyRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Buddy updated successfully',
          },
          404: {
            description: 'Buddy not found',
          },
        },
      },

      delete: {
        tags: ['Buddies'],
        summary: 'Delete buddy',
        description: 'Delete a buddy profile (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Buddy deleted successfully',
          },
          404: {
            description: 'Buddy not found',
          },
        },
      },
    },

    '/api/buddies/{id}/topics': {
      get: {
        tags: ['Buddies'],
        summary: 'Get buddy topics',
        description: 'Get all learning topics assigned to a buddy with completion status',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Buddy ID',
          },
        ],
        responses: {
          200: {
            description: 'Topics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/BuddyTopic',
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/buddies/{id}/progress': {
      get: {
        tags: ['Buddies'],
        summary: 'Get buddy progress',
        description: 'Get overall progress statistics for a buddy',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Progress retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    buddyId: { type: 'string', format: 'uuid' },
                    totalTopics: { type: 'integer' },
                    completedTopics: { type: 'integer' },
                    progressPercentage: { type: 'number', format: 'float' },
                    topics: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/BuddyTopic',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/buddies/{buddyId}/progress/{topicId}': {
      put: {
        tags: ['Buddies'],
        summary: 'Update topic progress',
        description: 'Mark a topic as completed or incomplete',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'buddyId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
          {
            name: 'topicId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateProgressRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Progress updated successfully',
          },
        },
      },

      patch: {
        tags: ['Buddies'],
        summary: 'Partial update topic progress',
        description: 'Mark a topic as completed or incomplete',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'buddyId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
          {
            name: 'topicId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateProgressRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Progress updated successfully',
          },
        },
      },
    },

    '/api/buddies/{id}/assign-mentor': {
      post: {
        tags: ['Buddies'],
        summary: 'Assign mentor to buddy',
        description: 'Assign or reassign a mentor to a buddy (Manager only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Buddy ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AssignMentorRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Mentor assigned successfully',
          },
          403: {
            description: 'Forbidden - Manager role required',
          },
          404: {
            description: 'Buddy or mentor not found',
          },
        },
      },
    },

    '/api/buddies/{id}/tasks': {
      get: {
        tags: ['Buddies'],
        summary: 'Get buddy tasks',
        description: 'Get all tasks assigned to a specific buddy',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Tasks retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Task',
                  },
                },
              },
            },
          },
        },
      },
    },

    // Portfolio endpoints
    '/api/buddies/{buddyId}/portfolio': {
      post: {
        tags: ['Portfolio'],
        summary: 'Create portfolio item',
        description: 'Create a new portfolio item for a buddy',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'buddyId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePortfolioRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Portfolio item created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Portfolio',
                },
              },
            },
          },
        },
      },
    },

    '/api/buddies/{buddyId}/portfolios': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get buddy portfolios',
        description: 'Get all portfolio items for a buddy',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'buddyId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Portfolios retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Portfolio',
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/portfolios/{id}': {
      patch: {
        tags: ['Portfolio'],
        summary: 'Update portfolio item',
        description: 'Update a portfolio item',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePortfolioRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Portfolio updated successfully',
          },
        },
      },

      delete: {
        tags: ['Portfolio'],
        summary: 'Delete portfolio item',
        description: 'Delete a portfolio item',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Portfolio deleted successfully',
          },
        },
      },
    },

    // Task endpoints
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Get all tasks',
        description: 'Retrieve all tasks with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'in_progress', 'submitted', 'completed', 'rejected'],
            },
            description: 'Filter by task status',
          },
          {
            name: 'priority',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
            description: 'Filter by priority',
          },
          {
            name: 'assignedToId',
            in: 'query',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Filter by assigned buddy ID',
          },
        ],
        responses: {
          200: {
            description: 'Tasks retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Task',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Tasks'],
        summary: 'Create task',
        description: 'Create a new task (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTaskRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Task created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Task',
                },
              },
            },
          },
          400: {
            description: 'Validation error',
          },
        },
      },
    },

    '/api/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task by ID',
        description: 'Retrieve a specific task by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Task retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Task',
                },
              },
            },
          },
          404: {
            description: 'Task not found',
          },
        },
      },

      put: {
        tags: ['Tasks'],
        summary: 'Update task',
        description: 'Update task information (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateTaskRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Task updated successfully',
          },
          404: {
            description: 'Task not found',
          },
        },
      },

      patch: {
        tags: ['Tasks'],
        summary: 'Partial update task',
        description: 'Partially update task (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateTaskRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Task updated successfully',
          },
        },
      },

      delete: {
        tags: ['Tasks'],
        summary: 'Delete task',
        description: 'Delete a task (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Task deleted successfully',
          },
          404: {
            description: 'Task not found',
          },
        },
      },
    },

    '/api/tasks/{id}/submissions': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task submissions',
        description: 'Get all submissions for a task',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
            description: 'Task ID',
          },
        ],
        responses: {
          200: {
            description: 'Submissions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Submission',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Tasks'],
        summary: 'Create submission',
        description: 'Submit a task solution',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateSubmissionRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Submission created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Submission',
                },
              },
            },
          },
        },
      },
    },

    // Resource endpoints
    '/api/resources': {
      get: {
        tags: ['Resources'],
        summary: 'Get all resources',
        description: 'Retrieve all learning resources with optional filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['documentation', 'video', 'article', 'course', 'tool'],
            },
          },
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            },
          },
          {
            name: 'difficulty',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
            },
          },
          {
            name: 'search',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Search by title or description',
          },
        ],
        responses: {
          200: {
            description: 'Resources retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Resource',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Resources'],
        summary: 'Create resource',
        description: 'Create a new learning resource (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateResourceRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Resource created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Resource',
                },
              },
            },
          },
        },
      },
    },

    '/api/resources/{id}': {
      get: {
        tags: ['Resources'],
        summary: 'Get resource by ID',
        description: 'Retrieve a specific resource by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Resource retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Resource',
                },
              },
            },
          },
          404: {
            description: 'Resource not found',
          },
        },
      },

      put: {
        tags: ['Resources'],
        summary: 'Update resource',
        description: 'Update resource information (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateResourceRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Resource updated successfully',
          },
        },
      },

      patch: {
        tags: ['Resources'],
        summary: 'Partial update resource',
        description: 'Partially update resource (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateResourceRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Resource updated successfully',
          },
        },
      },

      delete: {
        tags: ['Resources'],
        summary: 'Delete resource',
        description: 'Delete a resource (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Resource deleted successfully',
          },
        },
      },
    },

    // Topic endpoints
    '/api/topics': {
      get: {
        tags: ['Topics'],
        summary: 'Get all topics',
        description: 'Retrieve all topics with optional domain filter',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'domainRole',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'],
            },
            description: 'Filter topics by domain role',
          },
        ],
        responses: {
          200: {
            description: 'Topics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Topic',
                  },
                },
              },
            },
          },
        },
      },

      post: {
        tags: ['Topics'],
        summary: 'Create topic',
        description: 'Create a new topic (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTopicRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Topic created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Topic',
                },
              },
            },
          },
        },
      },
    },

    '/api/topics/{id}': {
      get: {
        tags: ['Topics'],
        summary: 'Get topic by ID',
        description: 'Retrieve a specific topic by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Topic retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Topic',
                },
              },
            },
          },
          404: {
            description: 'Topic not found',
          },
        },
      },

      put: {
        tags: ['Topics'],
        summary: 'Update topic',
        description: 'Update topic information (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTopicRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Topic updated successfully',
          },
        },
      },

      delete: {
        tags: ['Topics'],
        summary: 'Delete topic',
        description: 'Delete a topic (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Topic deleted successfully',
          },
        },
      },
    },

    // Dashboard endpoints
    '/api/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard statistics',
        description: 'Get overall statistics for the dashboard (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DashboardStats',
                },
              },
            },
          },
        },
      },
    },

    '/api/dashboard/activity': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get recent activity',
        description: 'Get recent system activity (Mentor+ access)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Activity retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Activity',
                  },
                },
              },
            },
          },
        },
      },
    },

    // Settings endpoints
    '/api/settings/profile': {
      patch: {
        tags: ['Settings'],
        summary: 'Update profile',
        description: 'Update user profile information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  avatarUrl: { type: 'string', format: 'uri' },
                  bio: { type: 'string' },
                  linkedinUrl: { type: 'string', format: 'uri' },
                  githubUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
          },
        },
      },
    },

    '/api/settings/preferences': {
      patch: {
        tags: ['Settings'],
        summary: 'Update preferences',
        description: 'Update user preferences',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  emailNotifications: { type: 'boolean' },
                  theme: { type: 'string', enum: ['light', 'dark'] },
                  language: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Preferences updated successfully',
          },
        },
      },
    },

    '/api/settings/privacy': {
      patch: {
        tags: ['Settings'],
        summary: 'Update privacy settings',
        description: 'Update user privacy settings',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  profileVisibility: { type: 'string', enum: ['public', 'private'] },
                  showEmail: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Privacy settings updated successfully',
          },
        },
      },
    },

    '/api/settings/export': {
      get: {
        tags: ['Settings'],
        summary: 'Export user data',
        description: 'Export all user data in JSON format',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Data exported successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    progress: { type: 'object' },
                    portfolios: { type: 'array', items: { $ref: '#/components/schemas/Portfolio' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/settings/account': {
      delete: {
        tags: ['Settings'],
        summary: 'Delete account',
        description: 'Permanently delete user account and all associated data',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Account deleted successfully',
          },
        },
      },
    },
  },
};
