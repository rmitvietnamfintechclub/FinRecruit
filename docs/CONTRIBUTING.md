# Contributing to Fin-Recruit Dashboard
Welcome to the Fin-Recruit Dashboard Phase 2 project! To keep our codebase clean, maintainable, and ensure smooth collaboration, please read the following guidelines carefully.

## 🌿 1. Branching Strategy
Always create a new branch from `dev`. Branch naming format follows ticket on JIRA

## 💬 2. Commit Message Convention
This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Format: `<type>(<scope>): <subject>`

**Ví dụ:**
- `feat(auth): add role base access control for admin`
- `fix(ui): resolve overflow issue in candidate table`
- `style(dashboard): update primary button colors`

## 🏗️ 3. Quy trình Code & Review (Pull Request)
1. **Pull the latest code:** Always run `git pull origin dev` before starting your work.
2. **Code & Test:** Strictly follow the project architecture (Backend goes in `src/app/(backend)`, Frontend goes in `src/app/(frontend)`).
3. **Open a Pull Request (PR):**
4. **Code Review:** At least 1 other team member must Approve the PR before it can be merged. Do not push directly to `main`.

## 🎨 4. Code Style
- The project has `Prettier` and `ESLint` pre-configured. Always format your code before committing.
- Remove all unnecessary `console.log()` statements before committing.