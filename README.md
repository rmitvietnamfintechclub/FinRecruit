# 🚀 Fin-Recruit - Recruitment Management System

Welcome to the Fin-Recruit project! This system streamlines our club's recruitment lifecycle, replacing fragmented, manual Excel files with a centralized, automated platform. 

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, MongoDB (Mongoose), and NextAuth.js.

---

## 📚 Essential Reading for New Developers
Before writing any code, please review these core documents located in the `docs` directory:
1. **`PHASE1_SUMMARY.md`**: Read this first! It explains the system architecture, existing features, and database schemas.
2. **`CONTRIBUTING.md`**: Our guidelines for branching, committing, and creating Pull Requests.
3. **`agents.md`**: If you use AI assistants, this file provides the necessary context to generate code matching our architecture.

## 💻 Local Setup & Installation

Follow these steps to get the project running on your local machine.

### 1. Clone the repository
```bash
git clone <REPO_URL>
cd finrecruit-app
```

### 2. Install dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 3. Setup Environment Variables (.env)
The app needs secret keys to connect to the database and authentication providers. 

**Local Authorization:** To test Executive Board or Department Head views locally without needing a real Admin to promote you, add your Google account email to the DEV lists below.
# LOCAL DEV ONLY: Auto-grant roles on first sign-in (Comma-separated)
DEV_EB_EMAILS="your.email@gmail.com,admin2@rmit.edu.vn"
DEV_HEAD_EMAILS="head.tech@gmail.com"


⚠️ **CRITICAL RULE:** NEVER commit `.env` to GitHub. It is already added to `.gitignore`.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. 
*(Tip: You can verify your database connection is working by visiting `http://localhost:3000/api/test-db`)*.

---