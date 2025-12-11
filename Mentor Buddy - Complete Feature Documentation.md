# Mentor Buddy - Complete Feature Documentation

A comprehensive mentorship management platform for tracking buddy progress, managing learning curriculums, and facilitating mentor-buddy relationships.

## Table of Contents
- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [User Roles](#user-roles)
- [Complete Feature List](#complete-feature-list)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)

---

## System Overview

Mentor Buddy is a full-stack mentorship management system that enables organizations to:
- Manage mentors and buddies across multiple technical domains
- Track learning progress through structured curriculums
- Assign and monitor tasks with submissions
- Maintain resource libraries and learning materials
- Generate analytics and progress reports

**Supported Domains:** Frontend, Backend, Fullstack, DevOps, QA, HR

---

## Tech Stack

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Password Security:** bcryptjs

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI (shadcn/ui)
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** Wouter
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

---

## Quick Start

### Backend Setup
```bash
cd mentor-buddy-backend
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Frontend Setup
```bash
cd mentor-buddy-ui
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your backend API URL

# Start development server
npm run dev
```

---

## User Roles

The system supports three distinct user roles with hierarchical permissions:

### 1. **Manager** (Full System Access)
- Complete control over all system features
- Manages managers, mentors, and buddies
- Creates and publishes curriculums
- Views system-wide analytics

### 2. **Mentor** (Teaching & Mentoring)
- Manages assigned buddies
- Creates and assigns tasks
- Reviews buddy submissions
- Tracks buddy progress
- Manages resources for their domain

### 3. **Buddy** (Learning & Execution)
- Views assigned curriculum
- Completes assigned tasks
- Submits task completions
- Tracks own progress
- Accesses learning resources

---

## Complete Feature List

### Authentication & Authorization
- ✅ **User Registration & Login**
  - Email/password authentication
  - JWT token-based sessions (7-day expiry)
  - Secure password hashing with bcryptjs
  - Token blacklist for logout

- ✅ **Role-Based Access Control (RBAC)**
  - Three-tier role hierarchy: Manager → Mentor → Buddy
  - Protected routes with middleware
  - Domain-specific access control
  - Automatic role-based navigation

- ✅ **Session Management**
  - Persistent login with localStorage
  - Auto-logout on token expiration
  - Change password functionality
  - Redirect to login on unauthorized access

---

### Manager Features

#### 1. **Dashboard**
- System-wide statistics overview
- Total mentors, active buddies count
- Tasks this week, completion rates
- Quick action cards for navigation
- Recent activity feed

#### 2. **Manager Management**
- View all managers in table/card view
- Add new manager accounts
- Edit manager information
- Delete managers (except self)
- Filter by domain (Frontend, Backend, etc.)
- Search by name or email
- Domain badge display
- Pagination support (5/10/25 per page)

#### 3. **Mentor Management**
- View all mentors with filtering
- Create new mentor profiles
- Assign mentors to domains
- View mentor details and assigned buddies
- Track mentor performance
- Table and card view modes
- Search and filter capabilities

#### 4. **Buddy Management**
- View all buddies across organization
- Create buddy profiles
- Assign buddies to mentors
- Track buddy status (Active, Inactive, Exited)
- View buddy progress and curriculum
- Filter by status and domain
- Domain role assignment
- Detailed buddy profiles with curriculum tracking

#### 5. **Curriculum Management**
- Create domain-specific curriculums
- Manage curriculum weeks and tasks
- Publish/draft curriculum status
- Version control (v1.0, v1.1, etc.)
- Curriculum builder with week structure
- Task assignment per week
- View curriculum submissions from all buddies
- Archive outdated curriculums
- Tag-based organization
- Filter by domain and status

#### 6. **Resource Management**
- Create learning resources
- Categorize by type (Documentation, Video, Article, Course, Tool)
- Set difficulty levels (Beginner, Intermediate, Advanced)
- Add tags for organization
- Set duration estimates
- Author attribution
- Rating system
- Bookmark favorite resources
- Share resources

#### 7. **Analytics & Reporting**
- System-wide performance metrics
- Buddy completion rates
- Task assignment analytics
- Domain-wise statistics
- Progress trends over time

---

### Mentor Features

#### 1. **Mentor Dashboard**
- Personal statistics overview
- Assigned buddies count
- Task completion metrics
- Quick access to buddy list
- Recent activity

#### 2. **Buddy Management**
- View assigned buddies only
- Track individual buddy progress
- Assign tasks to buddies
- Review buddy submissions
- Update buddy role/status
- View buddy portfolios
- Monitor curriculum completion

#### 3. **Task Management**
- Create new tasks for buddies
- Set task deadlines
- Assign priority levels
- Task categorization
- View task submissions
- Approve/reject submissions
- Provide feedback on submissions

#### 4. **Curriculum Access**
- View published curriculums
- Assign curriculums to buddies
- Track buddy progress through curriculum
- View week-by-week completion
- Monitor task submissions per week

#### 5. **Resource Management**
- Add resources for buddies
- Edit own resources
- View all resources
- Filter by category and difficulty
- Share resources with buddies

#### 6. **Review Queue**
- Pending submission reviews
- Quick approval/rejection interface
- Feedback submission
- Priority-based queue

---

### Buddy Features

#### 1. **Buddy Dashboard**
- Personal progress overview
- Current curriculum status
- Assigned mentor information
- Task completion metrics
- Overall progress percentage

#### 2. **My Curriculum**
- View assigned curriculum details
- Week-by-week task breakdown
- Task completion status
- Progress tracking per week
- Curriculum timeline
- Task descriptions and requirements
- Submit task completions
- View submission history

#### 3. **Task Management**
- View assigned tasks
- Filter by status (Not Started, In Progress, Completed)
- Submit task completions
- Add GitHub repository links
- Add deployment/live links
- View task feedback from mentor
- Resubmit tasks after feedback

#### 4. **Submissions**
- Submit GitHub repository URLs
- Submit deployment/live URLs
- View submission status
- Track submission history
- View mentor feedback
- Resubmit after corrections

#### 5. **Progress Tracking**
- Week-by-week progress visualization
- Overall curriculum completion percentage
- Task completion metrics
- Time tracking per task
- Milestone tracking

#### 6. **Portfolio Management**
- Create personal portfolio entries
- Showcase completed projects
- Add project links and descriptions
- Upload project images
- Edit/delete portfolio items
- Public portfolio view

#### 7. **Resource Access**
- Browse learning resources
- Filter by category, type, difficulty
- Bookmark favorite resources
- Search resources by tags
- View resource ratings
- Access external resource links

#### 8. **Mentor Access**
- View assigned mentor profile
- View mentor contact information
- Access mentor-shared resources

---

### Cross-Role Features

#### 1. **User Profile**
- View personal information
- Update profile details
- Change password
- Domain role display
- Email management

#### 2. **Settings**
- Profile settings
- Notification preferences
- Privacy settings
- Data export (JSON format)
- Account management

#### 3. **Search & Filter**
- Global search across entities
- Advanced filtering options
- Domain-based filtering
- Status-based filtering
- Real-time search results

#### 4. **Responsive Design**
- Mobile-responsive layouts
- Touch-friendly interfaces
- Responsive tables and cards
- Mobile navigation menu
- Optimized for all screen sizes

#### 5. **UI/UX Features**
- Consistent design language
- Standardized page headers with stats
- Unified filter bars
- Clean card-based layouts
- Smooth transitions
- Loading states with spinners
- Empty state illustrations
- Toast notifications for actions
- Confirmation dialogs for destructive actions
- Form validation with error messages
- Optimized padding and spacing
- Color-coded status badges

---

## Architecture

### Database Schema

#### Core Tables
```
users
├── id (UUID)
├── email (unique)
├── password (hashed)
├── name
├── role (manager/mentor/buddy)
└── domainRole (frontend/backend/fullstack/devops/qa/hr)

mentors
├── id (UUID)
├── userId (FK → users)
├── expertise
└── bio

buddies
├── id (UUID)
├── userId (FK → users)
├── assignedMentorId (FK → mentors)
├── status (active/inactive/exited)
├── curriculumId (FK → curriculum)
└── progress (JSON)

curriculum
├── id (UUID)
├── name
├── description
├── domainRole
├── totalWeeks
├── status (draft/published/archived)
├── version
└── weeks (JSON array)

tasks
├── id (UUID)
├── title
├── description
├── assignedBy (FK → mentors)
├── assignedTo (FK → buddies)
├── curriculumId (FK → curriculum)
├── weekNumber
├── status
└── dueDate

submissions
├── id (UUID)
├── taskId (FK → tasks)
├── buddyId (FK → buddies)
├── githubUrl
├── liveUrl
├── status (pending/approved/rejected)
├── feedback
└── submittedAt

resources
├── id (UUID)
├── title
├── description
├── type (documentation/video/article/course/tool)
├── category
├── difficulty (beginner/intermediate/advanced)
├── url
├── tags (array)
└── rating

portfolios
├── id (UUID)
├── buddyId (FK → buddies)
├── title
├── description
├── technologies (array)
├── githubUrl
├── liveUrl
└── imageUrl
```

#### Entity Relationships
```
users (1) ──── (1) mentors
users (1) ──── (1) buddies
mentors (1) ── (M) buddies
curriculum (1) ─ (M) tasks
buddies (1) ─── (M) submissions
buddies (1) ─── (M) portfolios
tasks (1) ───── (M) submissions
```

### API Architecture

#### Base URL
- Development: `http://localhost:3000`
- Production: `https://mentor-buddy-backend.onrender.com`

#### Authentication
All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/login          # User login
POST   /api/auth/register       # User registration
POST   /api/auth/logout         # Logout (blacklist token)
GET    /api/auth/me             # Get current user
POST   /api/auth/change-password # Change password
PUT    /api/auth/role           # Update user role (Manager only)
```

### Users (Manager Only)
```
GET    /api/users               # List all users
GET    /api/users/:id           # Get user by ID
POST   /api/users               # Create new user
PATCH  /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user
```

### Mentors
```
GET    /api/mentors             # List all mentors
GET    /api/mentors/:id         # Get mentor details
POST   /api/mentors             # Create mentor (Manager)
PATCH  /api/mentors/:id         # Update mentor
DELETE /api/mentors/:id         # Delete mentor (Manager)
GET    /api/mentors/:id/buddies # Get assigned buddies
```

### Buddies
```
GET    /api/buddies             # List all buddies
GET    /api/buddies/:id         # Get buddy details
POST   /api/buddies             # Create buddy (Manager/Mentor)
PATCH  /api/buddies/:id         # Update buddy
DELETE /api/buddies/:id         # Delete buddy (Manager)
GET    /api/buddies/:id/progress # Get buddy progress
PATCH  /api/buddies/:id/progress # Update buddy progress
GET    /api/buddies/:id/curriculum # Get buddy curriculum
```

### Curriculum Management
```
GET    /api/curriculums         # List all curriculums
GET    /api/curriculums/:id     # Get curriculum details
POST   /api/curriculums         # Create curriculum (Manager)
PATCH  /api/curriculums/:id     # Update curriculum (Manager)
DELETE /api/curriculums/:id     # Delete curriculum (Manager)
POST   /api/curriculums/:id/publish # Publish curriculum (Manager)
GET    /api/curriculums/:id/submissions # Get all submissions
```

### Tasks
```
GET    /api/tasks               # List tasks
GET    /api/tasks/:id           # Get task details
POST   /api/tasks               # Create task (Manager/Mentor)
PATCH  /api/tasks/:id           # Update task
DELETE /api/tasks/:id           # Delete task
POST   /api/tasks/:id/submissions # Submit task completion
```

### Submissions
```
GET    /api/submissions         # List submissions
GET    /api/submissions/:id     # Get submission details
POST   /api/submissions         # Create submission (Buddy)
PATCH  /api/submissions/:id     # Update submission status
DELETE /api/submissions/:id     # Delete submission
POST   /api/submissions/:id/approve # Approve submission (Mentor)
POST   /api/submissions/:id/reject  # Reject submission (Mentor)
```

### Resources
```
GET    /api/resources           # List all resources
GET    /api/resources/:id       # Get resource details
POST   /api/resources           # Create resource
PATCH  /api/resources/:id       # Update resource
DELETE /api/resources/:id       # Delete resource
```

### Portfolios
```
GET    /api/portfolios          # List portfolios
GET    /api/portfolios/buddy/:id # Get buddy portfolios
POST   /api/portfolios          # Create portfolio entry
PATCH  /api/portfolios/:id      # Update portfolio
DELETE /api/portfolios/:id      # Delete portfolio
```

### Dashboard & Analytics
```
GET    /api/dashboard/stats     # Get dashboard statistics
GET    /api/dashboard/activity  # Get recent activity
GET    /api/analytics           # Get system analytics
```

### Settings
```
GET    /api/settings/profile    # Get profile settings
PATCH  /api/settings/profile    # Update profile
GET    /api/settings/preferences # Get user preferences
PATCH  /api/settings/preferences # Update preferences
GET    /api/settings/export     # Export user data
```

---

## Key Features Summary

### ✅ Complete System Features (40+)

**Authentication & Security** (5)
- User registration, login, logout
- JWT authentication with 7-day expiry
- Role-based access control
- Password change functionality
- Token blacklist for security

**Manager Features** (10)
- Manager dashboard with stats
- Manager CRUD operations
- Mentor management
- Buddy management
- Curriculum creation & publishing
- Resource management
- System-wide analytics
- User role management
- Domain assignment
- Submission oversight

**Mentor Features** (8)
- Mentor dashboard
- Assigned buddy management
- Task creation & assignment
- Submission review & feedback
- Progress tracking
- Resource contribution
- Review queue
- Curriculum assignment

**Buddy Features** (9)
- Buddy dashboard with progress
- Curriculum viewing & tracking
- Task viewing & completion
- Task submission (GitHub + Live URLs)
- Progress visualization
- Portfolio management
- Resource access
- Mentor information viewing
- Week-by-week progress

**Shared Features** (8)
- Responsive design for all devices
- Search & filter across all pages
- Profile management
- Settings & preferences
- Toast notifications
- Loading states
- Empty state handling
- Consistent UI/UX

---

## Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Consistent component structure
- Reusable UI components
- Type-safe API calls with RTK Query

### Component Architecture
- Feature-based folder structure
- Reusable PageHeader component
- Standardized FilterBar component
- Consistent loading states (LoadingSpinner)
- Unified empty states

### State Management
- Redux Toolkit for global state
- RTK Query for API caching
- Optimistic updates for better UX
- Automatic cache invalidation

### UI/UX Standards
- Consistent spacing: `p-6` pages, `p-4` cards, `py-3 px-4` tables
- Color-coded status badges with borders
- Hover states for all interactive elements
- Smooth transitions (200ms)
- No excessive animations

---

## Deployment

### Backend Deployment (Render)
```bash
# Configured via render.yaml
# Auto-deploys from main branch
# Environment variables set in Render dashboard
```

### Frontend Deployment (Vercel)
```bash
# Configured via vercel.json
# Auto-deploys from main branch
# Environment variables set in Vercel dashboard
```

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Support & Contribution

For issues, feature requests, or contributions, please refer to the project repository.

**License:** Proprietary

---

**Last Updated:** November 2024
**Version:** 1.0.0
