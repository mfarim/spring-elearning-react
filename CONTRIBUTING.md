# 🤝 Contributing to Spring E-Learning & CBT Platform

Thank you for your interest in contributing to this project! We welcome contributions from the community to help improve this open-source platform.

---

## 🛠️ Development Setup

### Prerequisites
- **Java 21 LTS** (Eclipse Temurin recommended)
- **Node.js 20+** and **npm**
- **Docker & Docker Compose**
- **PostgreSQL 16** (or run via Docker)
- **Redis 7** (or run via Docker)

### Quick Start with Docker
The easiest way to spin up the local development environment is with Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/mfarim/spring-elearning-react.git
cd spring-elearning-react

# 2. Start PostgreSQL, Redis, MinIO, Backend, and Frontend
docker compose up -d

# 3. Check health status
docker compose ps
curl http://localhost:8080/actuator/health
```

### Running Backend Locally
```bash
cd backend

# Ensure PostgreSQL and Redis are running
./mvnw clean spring-boot:run
```

API documentation will be accessible at:
- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Health Check**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)

### Running Frontend Locally
```bash
cd frontend

npm install
npm run dev
```
Frontend will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 📂 Seed Demo Data
To populate the database with realistic sample users, classrooms, subjects, learning materials, and CBT examinations:

```bash
# Connect to PostgreSQL container and load the seed script:
docker exec -i elearning-postgres psql -U postgres -d elearning < backend/src/main/resources/db/migration/seed_demo_data.sql
```

Default credentials:
- **Admin**: `admin@elearning.com` / `password`
- **Teacher**: `teacher@elearning.com` / `password`
- **Student**: `student@elearning.com` / `password`

---

## 🧪 Testing & Code Quality

Before opening a pull request, ensure that your code complies with the project's formatting and testing checks:

### Backend Tests
```bash
cd backend
./mvnw clean test
```

### Frontend Lint & Build
```bash
cd frontend
npm run lint
npm run build
```

---

## 🔀 Pull Request Guidelines

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit** your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(auth): implement refresh token rotation"
   ```
3. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Open a Pull Request** describing the problem, solution, and screenshots if UI changes are involved.

---

## 🛡️ Security Vulnerabilities
If you discover a potential security vulnerability, please report it privately to the maintainers rather than opening a public issue.
