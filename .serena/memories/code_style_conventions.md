# Code Style and Conventions

## TypeScript/React (Frontend)
- **TypeScript**: Strict mode enabled with no unused locals/parameters
- **React**: Functional components with hooks
- **JSX**: react-jsx transform
- **Module Resolution**: Bundler mode with ES modules
- **Imports**: Allow TypeScript extensions in imports
- **Target**: ES2020 with DOM libraries

### ESLint Rules
- Extends: eslint:recommended, @typescript-eslint/recommended, react-hooks/recommended
- React Refresh: Only export components warning
- Parser: @typescript-eslint/parser
- Strict TypeScript checking for unused variables

## Python (Backend)
- **Framework**: FastAPI with Pydantic models for data validation
- **Type Hints**: Used for API endpoints and data models
- **Async/Await**: Async functions for API endpoints
- **Class Structure**: Pydantic BaseModel for request/response schemas
- **Error Handling**: Try-except blocks with proper exception handling

## General Conventions
- **File Naming**: 
  - React components: PascalCase (e.g., App.tsx)
  - Python modules: snake_case (e.g., main.py)
- **Configuration**: Environment variables for runtime configuration
- **API Design**: RESTful endpoints with JSON payloads
- **CORS**: Enabled for cross-origin requests between frontend and backend