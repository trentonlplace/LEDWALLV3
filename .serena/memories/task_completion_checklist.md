# Task Completion Checklist

## When Completing Frontend Tasks

### 1. Code Quality Checks
```bash
# Run TypeScript type checking
npm run build  # This includes tsc

# Run ESLint
npm run lint

# Fix lint issues if possible
npx eslint . --ext ts,tsx --fix
```

### 2. Visual Testing
- Start dev server: `npm run dev`
- Test in browser at http://localhost:3000
- Check console for errors
- Verify responsive design
- Test webcam permissions and functionality

### 3. Build Verification
```bash
# Ensure production build works
npm run build
npm run preview
```

## When Completing Backend Tasks

### 1. Code Quality
- Ensure proper type hints on functions
- Validate Pydantic models are used for requests/responses
- Check error handling with try-except blocks

### 2. Testing
```bash
# Start backend
./start-backend.sh

# Test API endpoints
curl http://localhost:8000/status
curl http://localhost:8000/docs  # FastAPI automatic documentation
```

### 3. Serial Communication
- Verify Arduino connection with proper port detection
- Test serial commands if modified
- Check response handling

## General Completion Steps

### 1. Before Committing
- [ ] All linting passes (frontend: `npm run lint`)
- [ ] Type checking passes (frontend: `tsc`)
- [ ] Code follows established patterns
- [ ] No console.log() or print() statements left in production code
- [ ] Environment variables documented if added

### 2. Documentation
- [ ] Update README.md if functionality changed
- [ ] Add comments for complex logic
- [ ] Update API documentation if endpoints modified

### 3. Testing Checklist
- [ ] Manual testing completed
- [ ] Edge cases considered
- [ ] Error states handled gracefully
- [ ] Cross-browser testing (if frontend)
- [ ] Serial communication verified (if backend)

### 4. Final Verification
- [ ] Both frontend and backend start without errors
- [ ] Full user workflow tested (connect → set ROI → start mapping)
- [ ] Check for any hardcoded values that should be configurable
- [ ] Verify no sensitive information in code

## Quick Validation Commands
```bash
# Frontend validation
npm run lint && npm run build

# Backend validation (if tests exist)
cd backend && python -m pytest

# Full system test
# Terminal 1: ./start-backend.sh
# Terminal 2: npm run dev
# Browser: Test full workflow
```