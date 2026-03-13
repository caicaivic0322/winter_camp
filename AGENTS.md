# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite + React frontend: reusable UI in `src/components/`, route screens in `src/pages/`, shared state in `src/contexts/`, static content in `src/data/`, and CSS in `src/styles/`. `server/` holds the Express API plus JSON-backed storage in `server/data/` and markdown parsing helpers in `server/lib/`. Course source material lives in the Chinese-named lesson folders and `exam_files/`. Planning notes belong in `docs/`, and `generate_pdfs.py` is the standalone script for PDF export.

## Build, Test, and Development Commands
Run `npm install` in the repo root, then `npm run dev` to start the frontend on Vite. Use `npm run build` to create the production bundle and `npm run preview` to smoke-test the built app locally. For the backend, run `npm install` inside `server/`, then `npm start` to launch the Express service. Use `python3 generate_pdfs.py` only when updating printable lesson or exam assets.

## Coding Style & Naming Conventions
Follow the existing style: ES modules, React function components, and no semicolons. Use 2-space indentation in JSX, CSS, and server code. Name React components and context files in `PascalCase` (`Navbar.jsx`, `AuthContext.jsx`), utilities and data modules in `camelCase` (`mdParser.js`, `lessonContents.js`), and keep lesson content filenames descriptive and consistent with the current Chinese naming pattern.

## Testing Guidelines
There is no dedicated frontend or backend test runner configured today, and no coverage threshold is enforced. Before opening a PR, at minimum run `npm run build` from the root and manually verify the affected flow in `npm run dev`. For backend changes, start `server/index.js` and exercise the impacted API route against the JSON data files. If you add tests, keep them focused and place them near the code they validate.

## Commit & Pull Request Guidelines
Recent history mixes Conventional Commits (`feat: add heapsort interactive demo`) with short Chinese summaries. Prefer clear, imperative commit messages; `feat:`, `fix:`, and `docs:` are good defaults. Keep PRs scoped, describe user-visible changes, list validation steps, and attach screenshots or short recordings for UI updates. Link the relevant issue or design note when one exists.

## Configuration & Data Notes
Do not commit secrets; this project currently relies on local JSON files instead of a database. Treat `server/data/*.json` as mutable app data, and avoid destructive edits without a backup. When changing course timing or release rules, update the corresponding frontend config and document the date change in the PR.
