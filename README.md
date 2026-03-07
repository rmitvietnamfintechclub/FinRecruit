# 🚀 FinRecruit - Recruitment Management System

Welcome to the FinRecruit project! This system streamlines our club's recruitment lifecycle, replacing manual Excel files with a centralized, automated Next.js platform. 

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, and MongoDB.

---

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

### 3. Setup Environment Variables (.env.local)
The app needs secret keys to connect to the database and authentication providers. 

1. Duplicate the `.env.example` file and rename it to **`.env.local`**.
2. Copy actual connection strings and paste them into your new `.env.local` file.

⚠️ **CRITICAL RULE:** NEVER commit `.env.local` to GitHub. It is already added to `.gitignore`.

```env
# Inside your .env.local
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0...
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. 
*(Tip: You can verify your database connection is working by visiting `http://localhost:3000/api/test-db`)*.

---

## 🌿 Git Workflow & Branching Rules

To avoid merge conflicts and keep our codebase clean, we follow a strict Pull Request workflow. **DO NOT push directly to the `main` branch.**

### Branch Naming Convention
Always create a new branch before starting your work. Use the following prefixes based on your task:
* `feat/...` ➔ For new features (e.g., `git checkout -b feat/smart-dashboard`)
* `fix/...` ➔ For bug fixes (e.g., `git checkout -b fix/login-crash`)
* `ui/...` ➔ For strictly UI/CSS tasks (e.g., `git checkout -b ui/navbar-styling`)
* `docs/...` ➔ For updating README or documentation

### Pull Request (PR) Policy (Definition of Done)
1. Commit your changes and push your branch to GitHub: `git push origin <your-branch-name>`
2. Open a **Pull Request (PR)** on GitHub targeting the main integration branch.
3. **Peer Review:** Your PR MUST be reviewed and approved by at least **one other team member** before merging.
4. **Pre-checks:** Before requesting a review, ensure your code has no TypeScript errors and works perfectly on your local machine.