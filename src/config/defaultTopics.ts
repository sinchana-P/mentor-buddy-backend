import { DomainRole } from '../shared/schema.ts';

export interface TopicDefinition {
  name: string;
  category: string;
  domainRole: DomainRole;
}

export const DEFAULT_TOPICS: Record<DomainRole, TopicDefinition[]> = {
  frontend: [
    { name: 'React Fundamentals', category: 'Framework', domainRole: 'frontend' },
    { name: 'TypeScript Basics', category: 'Language', domainRole: 'frontend' },
    { name: 'CSS Styling', category: 'Styling', domainRole: 'frontend' },
    { name: 'JavaScript ES6+', category: 'Language', domainRole: 'frontend' },
    { name: 'State Management', category: 'Architecture', domainRole: 'frontend' },
    { name: 'HTML Fundamentals', category: 'Markup', domainRole: 'frontend' },
    { name: 'React Components', category: 'Framework', domainRole: 'frontend' },
    { name: 'React Hooks', category: 'Framework', domainRole: 'frontend' },
    { name: 'Responsive Design', category: 'Styling', domainRole: 'frontend' },
    { name: 'Browser APIs', category: 'Web APIs', domainRole: 'frontend' },
    { name: 'Performance Optimization', category: 'Performance', domainRole: 'frontend' },
    { name: 'Testing (Jest/React Testing Library)', category: 'Testing', domainRole: 'frontend' }
  ],
  backend: [
    { name: 'Node.js Basics', category: 'Runtime', domainRole: 'backend' },
    { name: 'Express Framework', category: 'Framework', domainRole: 'backend' },
    { name: 'Database Design', category: 'Database', domainRole: 'backend' },
    { name: 'API Development', category: 'API', domainRole: 'backend' },
    { name: 'Authentication', category: 'Security', domainRole: 'backend' },
    { name: 'Server Deployment', category: 'Deployment', domainRole: 'backend' },
    { name: 'RESTful APIs', category: 'API', domainRole: 'backend' },
    { name: 'SQL & PostgreSQL', category: 'Database', domainRole: 'backend' },
    { name: 'MongoDB & NoSQL', category: 'Database', domainRole: 'backend' },
    { name: 'Middleware & Error Handling', category: 'Framework', domainRole: 'backend' },
    { name: 'Caching Strategies', category: 'Performance', domainRole: 'backend' },
    { name: 'API Testing & Documentation', category: 'Testing', domainRole: 'backend' }
  ],
  fullstack: [
    // Frontend topics
    { name: 'React Fundamentals', category: 'Frontend', domainRole: 'fullstack' },
    { name: 'TypeScript Basics', category: 'Language', domainRole: 'fullstack' },
    { name: 'State Management', category: 'Frontend', domainRole: 'fullstack' },
    { name: 'CSS & Styling', category: 'Frontend', domainRole: 'fullstack' },
    // Backend topics
    { name: 'Node.js & Express', category: 'Backend', domainRole: 'fullstack' },
    { name: 'Database Design', category: 'Backend', domainRole: 'fullstack' },
    { name: 'API Development', category: 'Backend', domainRole: 'fullstack' },
    { name: 'Authentication & Authorization', category: 'Backend', domainRole: 'fullstack' },
    // Integration
    { name: 'Full Stack Integration', category: 'Integration', domainRole: 'fullstack' },
    { name: 'Deployment & DevOps Basics', category: 'Deployment', domainRole: 'fullstack' },
    { name: 'Testing (E2E & Integration)', category: 'Testing', domainRole: 'fullstack' },
    { name: 'Performance Optimization', category: 'Performance', domainRole: 'fullstack' }
  ],
  devops: [
    { name: 'Linux Fundamentals', category: 'Operating Systems', domainRole: 'devops' },
    { name: 'Docker Containers', category: 'Containerization', domainRole: 'devops' },
    { name: 'Kubernetes Basics', category: 'Orchestration', domainRole: 'devops' },
    { name: 'CI/CD Pipelines', category: 'Automation', domainRole: 'devops' },
    { name: 'AWS/Cloud Services', category: 'Cloud', domainRole: 'devops' },
    { name: 'Infrastructure as Code', category: 'Automation', domainRole: 'devops' },
    { name: 'Monitoring & Logging', category: 'Observability', domainRole: 'devops' },
    { name: 'Version Control (Git)', category: 'Tools', domainRole: 'devops' },
    { name: 'Networking Basics', category: 'Networking', domainRole: 'devops' },
    { name: 'Security Best Practices', category: 'Security', domainRole: 'devops' },
    { name: 'Configuration Management', category: 'Automation', domainRole: 'devops' },
    { name: 'Load Balancing & Scaling', category: 'Architecture', domainRole: 'devops' }
  ],
  qa: [
    { name: 'Testing Fundamentals', category: 'Testing', domainRole: 'qa' },
    { name: 'Manual Testing', category: 'Testing', domainRole: 'qa' },
    { name: 'Test Case Design', category: 'Testing', domainRole: 'qa' },
    { name: 'Automation Testing', category: 'Automation', domainRole: 'qa' },
    { name: 'Selenium WebDriver', category: 'Automation', domainRole: 'qa' },
    { name: 'API Testing', category: 'Testing', domainRole: 'qa' },
    { name: 'Performance Testing', category: 'Testing', domainRole: 'qa' },
    { name: 'Bug Tracking & Reporting', category: 'Process', domainRole: 'qa' },
    { name: 'Test Planning & Strategy', category: 'Process', domainRole: 'qa' },
    { name: 'Continuous Testing', category: 'Automation', domainRole: 'qa' },
    { name: 'Agile Testing', category: 'Process', domainRole: 'qa' },
    { name: 'Quality Metrics & Reporting', category: 'Process', domainRole: 'qa' }
  ],
  hr: [
    { name: 'Recruitment Strategies', category: 'Recruitment', domainRole: 'hr' },
    { name: 'Interviewing Techniques', category: 'Recruitment', domainRole: 'hr' },
    { name: 'Candidate Screening', category: 'Recruitment', domainRole: 'hr' },
    { name: 'Onboarding Process', category: 'Employee Management', domainRole: 'hr' },
    { name: 'Performance Management', category: 'Employee Management', domainRole: 'hr' },
    { name: 'Employee Relations', category: 'Employee Management', domainRole: 'hr' },
    { name: 'HR Policies & Compliance', category: 'Compliance', domainRole: 'hr' },
    { name: 'Compensation & Benefits', category: 'Compensation', domainRole: 'hr' },
    { name: 'Training & Development', category: 'Learning', domainRole: 'hr' },
    { name: 'HRIS Systems', category: 'Tools', domainRole: 'hr' },
    { name: 'Diversity & Inclusion', category: 'Culture', domainRole: 'hr' },
    { name: 'Conflict Resolution', category: 'Employee Management', domainRole: 'hr' }
  ]
};

/**
 * Get default topics for a specific domain role
 */
export function getDefaultTopicsForDomain(domainRole: DomainRole): TopicDefinition[] {
  return DEFAULT_TOPICS[domainRole] || [];
}

/**
 * Get all default topics across all domains
 */
export function getAllDefaultTopics(): TopicDefinition[] {
  return Object.values(DEFAULT_TOPICS).flat();
}
