# AGENTS.md - VoiceAction Development Guide

This document provides guidelines for agentic coding agents working on the VoiceAction project.

## Project Overview

VoiceAction is a React + TypeScript voice notes application built with Vite, Tailwind CSS v4, and Gemini AI integration. It features voice recording, note management, dark mode, and AI-powered note processing.

## Build & Development Commands

### Core Commands
```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build with Vite
npm run preview  # Preview production build
npm run clean    # Remove dist folder
npm run lint     # TypeScript type checking (tsc --noEmit)
```

### Single Test Execution
This project does not currently have a test framework configured. If adding tests, use one of:
```bash
# Vitest (recommended for Vite projects)
npx vitest run --reporter=verbose

# Jest
npx jest --verbose
```

## Code Style Guidelines

### Language & Framework
- **React 19** with functional components
- **TypeScript 5.8** (strict mode)
- **Tailwind CSS v4** for styling

### File Organization
```
src/
├── components/     # Reusable UI components
├── context/        # React context providers
├── hooks/          # Custom React hooks (useX pattern)
├── lib/            # Utility libraries
├── services/       # API services (geminiService.ts)
├── types.ts        # Global TypeScript interfaces
├── utils/          # Helper functions
├── App.tsx         # Main app component
└── *.tsx           # Screen components
```

### Imports & Path Aliases
- Use path alias `@/` for project-relative imports (e.g., `import { Note } from '@/types'`)
- Group imports: React → external libraries → internal modules → utilities
- Example:
  ```typescript
  import { useState, useEffect } from 'react';
  import { motion, AnimatePresence } from 'motion/react';
  import { Screen, Note } from '@/types';
  import { BottomNav } from '@/components';
  import { useAuth } from '@/hooks/useAuth';
  ```

### Naming Conventions
- **Components**: PascalCase (e.g., `NoteCard`, `ErrorBoundary`)
- **Hooks**: camelCase with `use` prefix (e.g., `useNotes`, `useAuth`)
- **Types/Interfaces**: PascalCase (e.g., `Note`, `AuthUser`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `STORAGE_KEY`)
- **Files**: camelCase for TypeScript (e.g., `geminiService.ts`)

### TypeScript Guidelines
- Use explicit return types for functions exported from modules
- Define interfaces for all data structures in `types.ts`
- Use `type` for unions/tuples, `interface` for object shapes
- Example:
  ```typescript
  export type Note = {
    id: string;
    title: string;
    content: string;
    type: 'task' | 'event' | 'idea' | 'audio' | 'voice' | 'text';
    timestamp: string;
    createdAt: number;
    pinned?: boolean;
    tags?: string[];
  };
  ```

### Component Structure
- Use named exports for components: `export const ComponentName`
- Use TypeScript with React.FC for typed props when needed
- Keep components focused (single responsibility)
- Example:
  ```typescript
  interface Props {
    title: string;
    onDelete: (id: string) => void;
  }

  export const NoteCard: React.FC<Props> = ({ title, onDelete }) => {
    return <div>{title}</div>;
  };
  ```

### Hooks Guidelines
- Follow React hooks rules (only call at top level)
- Custom hooks should return an object with named properties
- Example:
  ```typescript
  export function useNotes(userId: string | undefined) {
    const [notes, setNotes] = useState<Note[]>([]);
    // ... implementation
    return { notes, addNote, updateNote, deleteNote };
  }
  ```

### Error Handling
- Use try/catch blocks for async operations
- Log errors with `console.error()` for debugging
- Use ErrorBoundary components for component tree failures
- Handle missing API keys gracefully (see `geminiService.ts` for pattern)
- Example:
  ```typescript
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error("Operation failed:", error);
    return null;
  }
  ```

### Styling with Tailwind CSS v4
- Use custom theme variables defined in `index.css`
- Available colors: `base`, `surface`, `surface-low`, `surface-high`, `primary`, `on-surface`, `text-secondary`
- Available utilities: `glow-subtle`, `glow-medium`, `glow-strong`, `text-glow`, `ghost-border`
- Use `dark:` prefix for dark mode variants
- Example:
  ```typescript
  <div className="bg-surface text-on-surface dark:bg-base dark:text-fdf4e3">
    <button className="bg-primary text-black glow-medium hover:scale-105">
      Submit
    </button>
  </div>
  ```

### Dark Mode Implementation
- Toggle via `useDarkMode` hook returning `{ isDark, toggle }`
- Wrap components with `className={isDark ? 'dark' : ''}`
- Use CSS variables in `index.css` for theme colors

### Environment Variables
- Required: `GEMINI_API_KEY` - API key for Gemini AI
- Optional: `APP_URL` - Self-referential URL for callbacks
- Create `.env.local` from `.env.example` template

### State Management
- Use React Context for global auth state (`AuthContext`)
- Use local state with `useState` for component-level state
- Use custom hooks (`useNotes`, `useAuth`) for business logic

### Animation
- Use `motion` library from `motion/react`
- Prefer `AnimatePresence` with `mode="wait"` for screen transitions
- Keep animations subtle (300ms default duration)

### Security Best Practices
- Sanitize user input using `sanitize()` from `@/utils/sanitization`
- Never expose API keys in client-side code
- Use localStorage with caution (see `useNotes.ts` for pattern)

## Testing Guidelines

When adding tests to this project:
- Use **Vitest** (compatible with Vite)
- Place tests in `__tests__/` folder or alongside components with `.test.tsx` suffix
- Use `@testing-library/react` for component testing
- Example test command: `npx vitest run`

## Git Workflow

- Create feature branches from `main`
- Commit messages should be concise and descriptive
- Run `npm run lint` before committing
- Do not commit `.env.local` or sensitive files

## External Dependencies

Key libraries used:
- `@google/genai` - Gemini AI SDK
- `@react-three/fiber` / `@react-three/drei` - 3D components (for GlowingSphere)
- `firebase` - Authentication (currently mocked)
- `lucide-react` - Icons
- `motion` - Animations
- `three` - 3D graphics
- `tailwindcss` v4 - Styling

## Common Tasks

### Adding a new screen
1. Create `src/NewScreen.tsx`
2. Add screen type to `Screen` union in `types.ts`
3. Import and add to switch in `App.tsx`
4. Add navigation if needed

### Adding a new component
1. Create in appropriate folder under `src/components/`
2. Export named component
3. Add to `src/components/index.ts` barrel export
4. Use in screens/components

### Adding API integration
1. Create service in `src/services/`
2. Handle missing API keys gracefully
3. Return null on failure with error logging
