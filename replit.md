# Agenda Escolar Tânia Varella Ferreira

## Overview
This project is an educational agenda system developed with Node.js, Express, and PostgreSQL (Replit Database). Its primary purpose is to manage events, meal plans, announcements, and activities for students and school administration. The system aims to streamline communication and organization within the school environment.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with frequent updates and feedback loops. Ask before making major changes to the core architecture or public-facing features. I value detailed explanations for complex implementations.

## System Architecture
The system is built on a Node.js backend using Express, with data persistence handled by PostgreSQL (Replit Database) and Drizzle ORM. Frontend is developed with vanilla HTML, CSS, and JavaScript.

**UI/UX Decisions:**
- Supports both light and dark themes.
- Clear separation of concerns between student and administration interfaces.
- Interactive tables for managing teachers' attendance.
- Intuitive login/registration flow with role selection.

**Technical Implementations:**
- **Backend:** Node.js 20, TypeScript, Express 5.1.0.
- **Database:** PostgreSQL via `@neondatabase/serverless`, Drizzle ORM for schema management, `connect-pg-simple` for session storage.
- **Authentication:**
    - **Modern:** Replit Auth (OpenID Connect) for Google, GitHub, X, Apple, and email/password. Supports role-based authentication (Aluno, Direção, Administrador) with automatic user registration and profile updates.
    - **Legacy:** Retained for backward compatibility using `bcryptjs` for password hashing.
- **Frontend:** HTML, CSS, JavaScript for a responsive and interactive user experience.
- **Security:** Replit Auth, secure session management (HttpOnly/Secure cookies), automatic token refresh, prepared statements for SQL injection prevention, and a connection pool for performance.

**Feature Specifications:**
- **For Students:**
    - Login specific to classes (e.g., 1A, 2B, 3C).
    - View class events, school meal plans, announcements, and activities (Quizizz, Khan Academy, Redação Paraná).
    - Notification system and theme switching.
- **For Administration:**
    - Comprehensive administrative panel.
    - Manage events by class.
    - Edit weekly meal plans.
    - Track teacher attendance/absences by class.
    - Manage announcements and activities.
    - View and delete registered students.
- **Teacher Management:**
    - Record presence/absence with automatic date stamping.
    - Interactive table for real-time updates.

**System Design Choices:**
- **Project Structure:** Clear separation into `server/` (backend), `shared/` (Drizzle schema), `backend/` (legacy APIs), and `frontend/`.
- **Database Management:** Drizzle ORM for schema definition and migrations, with automated initial setup and seeding.
- **Authentication Flow:** Role-based authentication where users select their role (Student, Admin, Management) before initiating the OIDC flow, ensuring a tailored experience. Student class selection is prompted post-authentication and saved locally.

## External Dependencies
- **Replit Database:** PostgreSQL for persistent data storage.
- **Replit Auth:** OpenID Connect provider for user authentication.
- **`@neondatabase/serverless`:** PostgreSQL driver for serverless environments.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Express:** Web application framework for Node.js.
- **Passport.js:** Authentication middleware for Node.js (likely used with legacy system).
- **`bcryptjs`:** Password hashing library (used for legacy authentication).