# Spring E-Learning: Enterprise CBT & LMS Platform
### Built with Java 21, Spring Boot 3.4+, React 19, and Tailwind CSS v4

[![Backend CI](https://github.com/mfarim/spring-elearning-react/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/mfarim/spring-elearning-react/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/mfarim/spring-elearning-react/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/mfarim/spring-elearning-react/actions/workflows/frontend-ci.yml)

Spring E-Learning is an enterprise-grade Learning Management System (LMS) and Computer-Based Testing (CBT) engine designed from the ground up to replace legacy PHP/Laravel monolithic applications with a cloud-native, high-concurrency micro-architecture.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend Core** | Java 21 LTS, Spring Boot 3.4.3 |
| **Security & Auth** | Spring Security 6, JJWT 0.12.6, Method Security (`@PreAuthorize`), Impersonation Engine |
| **Persistence** | PostgreSQL 16, Spring Data JPA, Hibernate 6, HikariCP, Flyway Migrations |
| **Cache & Realtime** | Redis 7, Spring WebSocket + STOMP Message Broker, SockJS |
| **Batch Processing** | Apache POI (Excel `.xlsx` batch parsing for Students & Question Banks) |
| **API Documentation** | Springdoc OpenAPI 3 / Swagger UI |
| **Frontend Core** | React 19, TypeScript 5+, Vite 6 |
| **Styling** | Tailwind CSS v4 (Native CSS engine with `@tailwindcss/vite`) |
| **State Management** | Zustand 5, Axios with JWT interceptors |
| **Icons & UI** | Lucide React |
| **Deployment** | Docker Compose, Multi-stage Dockerfiles (OpenJDK 21 Alpine & Node 20 Alpine) |

---

## 🛡️ Enterprise Security & Anti-IDOR Architecture

1. **Answer Key Protection (`@JsonIgnore`)**: Question answer keys and explanations are stripped at the JPA entity serialization boundary. Students cannot inspect HTTP responses to harvest answers.
2. **Deterministic Anti-Cheat Proctoring**:
   - Tab-switch and window blur tracking via browser `visibilitychange` events.
   - Right-click context menu prevention.
   - Server-side violation counter with auto-termination when threshold (5) is exceeded.
3. **Server-Enforced Timer Integrity**:
   - Remaining time is strictly computed on the server (`min((startedAt + duration), endAt) - now()`).
   - Late answer saves are automatically rejected with immediate session finalization.
4. **Method-Level Object Ownership Checks**:
   - Teachers are strictly constrained to their assigned classrooms, subjects, examinations, and materials.
   - Cross-tenant and cross-user parameter tampering (IDOR) is blocked with standard 403 Forbidden exceptions.
5. **Secure Admin Impersonation**:
   - `POST /api/v1/admin/impersonate/{userId}` generates a scoped impersonation JWT carrying the admin's original identity claim.
   - Exiting impersonation restores the administrator's original session instantly.

---

## 🚀 Quick Start with Docker

To run the entire system (PostgreSQL, Redis, MinIO, Spring Boot Backend, and React Frontend) in containers:

```bash
docker compose up --build -d
```

- **Frontend App**: [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000) in dev mode)
- **Backend API**: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
- **Swagger Documentation**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **MinIO Object Console**: [http://localhost:9001](http://localhost:9001)

---

## 💻 Local Development Setup

### 1. Start Database & Redis
```bash
docker compose up -d postgres redis minio
```

### 2. Start Backend
```bash
cd backend
./mvnw spring-boot:run
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Default Credentials

The database migration auto-seeds the initial administrator, and the demo interface includes fast 1-click credential presets:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@elearning.com` | `Admin@123` | Full system control, Classrooms, Subjects, Teachers, Students, Excel Import, Impersonation |
| **Teacher** | `teacher@elearning.com` | `Teacher@123` | Exam Creator, Question Bank, Real-time CBT Monitor, Assignment Grading, Materials |
| **Student** | `student@elearning.com` | `Student@123` | CBT Fullscreen Exam Runner, Course Materials, Assignment Submissions, Discussion Board |

---

## 📁 Repository Layout

```
java-spring-react-elearning/
├── docker-compose.yml              # Complete container orchestration
├── README.md                       # Comprehensive architectural guide
├── backend/                        # Spring Boot 3.4+ Application
│   ├── Dockerfile                  # Multi-stage Java 21 container build
│   ├── pom.xml                     # Maven dependencies
│   └── src/main/
│       ├── java/com/elearning/
│       │   ├── common/             # BaseEntity, Enums, ApiResponse, FileStorage, Exceptions
│       │   ├── config/             # SecurityConfig, WebSocketConfig
│       │   ├── security/           # JwtProvider, JwtFilter, CustomUserDetailsService
│       │   └── modules/
│       │       ├── academic/       # Classrooms & Subjects
│       │       ├── assignment/     # Assignments, Submissions, Discussions
│       │       ├── auth/           # Login, Impersonate, Profile
│       │       ├── exam/           # CBT Engine, Questions, ExamRunner, Live Monitor, STOMP
│       │       ├── material/       # Learning Materials, Views Tracking
│       │       └── user/           # Teachers, Students (Excel POI import, Exam Cards)
│       └── resources/
│           ├── application.yml     # Config properties
│           └── db/migration/       # Flyway schema V1__initial_schema.sql
└── frontend/                       # React 19 + TypeScript + Vite 6 Application
    ├── Dockerfile                  # Production Nginx container build
    ├── nginx.conf                  # Reverse proxy for /api/ and /ws/
    └── src/
        ├── api/client.ts           # Axios client with JWT interceptors
        ├── store/authStore.ts      # Zustand auth & impersonation state
        ├── types/index.ts          # TypeScript domain models
        ├── components/common/      # Navbar, Sidebar, Layout, ProtectedRoute
        └── pages/
            ├── auth/Login.tsx
            ├── dashboard/Dashboard.tsx
            ├── admin/              # Classrooms, Subjects, Teachers, Students (with Excel import & Exam Cards)
            ├── materials/          # MaterialsList, MaterialDetail reader
            ├── exams/              # ExamList, ExamEditor, ExamMonitor, ExamRunner
            └── assignments/        # AssignmentList, AssignmentDetail
```
