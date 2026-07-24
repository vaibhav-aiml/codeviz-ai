# Contributing to CodeViz AI

Thank you for your interest in contributing to **CodeViz AI**! We welcome bug reports, feature suggestions, documentation improvements, and code contributions.

---

## 🛠️ Development Workflow

1. **Fork & Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/codeviz-ai.git
   cd codeviz-ai
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Set Up Local Environments**
   - **Backend**:
     ```bash
     cd backend
     python -m venv venv
     source venv/bin/activate # or .\venv\Scripts\activate on Windows
     pip install -r requirements.txt
     ```
   - **Frontend**:
     ```bash
     cd frontend
     npm install
     ```

4. **Run Tests & Linters**
   Ensure all checks pass before submitting your PR:
   - Backend tests & linting:
     ```bash
     cd backend
     ruff check app/ tests/
     pytest -v -o pythonpath=.
     ```
   - Frontend tests, linting, & production build:
     ```bash
     cd frontend
     npm run lint
     npm run test
     npm run build
     ```

5. **Submit a Pull Request**
   Push your branch and open a PR against `main`. Describe your changes clearly and link any relevant issues.

---

## 🎨 Code Style Guidelines

- **Python**: Follow PEP 8 guidelines. Format code using `ruff`.
- **TypeScript / React**: Use functional components, explicit TypeScript types, and Tailwind CSS.
- **Commit Messages**: Keep commit messages concise, descriptive, and imperative (e.g. `feat: add OpenAI LLM provider abstraction`).
