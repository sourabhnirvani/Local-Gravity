# LocalGravity Project Documentation

## Overview

LocalGravity is an offline-first desktop IDE that combines two major experiences in one Electron application:

- a developer workspace for code generation, editing, file operations, and local execution
- a student workspace for guided learning, onboarding, and question-paper-assisted study

The application is built around local models served through Ollama so the primary workflow does not depend on external AI APIs.

## Main Capabilities

### Developer Workspace

- File explorer with workspace-based access
- Multi-tab editor with dirty state tracking
- AI chat panel for code generation and editing
- `// FILE:` driven apply flow for generated files
- Live center-editor preview during streamed generation
- Run/output support for supported local file types
- Template-backed website generation for common college-practical frontend requests

### Student Workspace

- Full-screen student learning layout
- Student onboarding with local profile persistence
- Developer/student mode switching
- Personalized tutoring based on class and syllabus
- Persistent student chat sessions
- Question paper request flow with local retrieval and analysis

## Architecture

### Renderer

The renderer is a React + TypeScript application that manages:

- editor state
- open files
- AI chat state
- student mode state
- settings
- output panel state

### Main Process

The Electron main process manages:

- secure file-system IPC
- local run/restart/stop execution
- shell open handlers
- auth and feedback handlers
- question paper scraping, cataloging, download, and extraction

### Local AI Layer

Ollama provides local model inference. Prompting is mode-aware:

- developer prompts focus on code generation and workspace context
- student prompts focus on class-aware tutoring

## Important Feature Areas

### Student Mode Implementation

- `src/components/StudentWorkspace.tsx`
- `src/components/StudentOnboardingCard.tsx`
- `src/services/settingsService.ts`
- `src/types/index.ts`

Student mode now behaves as a separate full application view instead of a side panel.

### Question Paper Integration

- `electron/questionPapers.ts`
- `src/services/ollama.ts`

Supported official board sources currently include CBSE, Karnataka SSLC, and Karnataka PUC.

### Template Website System

- `src/services/prebuiltWebsites.ts`
- `src/components/AIChatPanel.tsx`
- `src/components/AIMessageList.tsx`

This system improves outcomes for weaker local models by using reliable prebuilt frontend templates for common requests while still showing a generation workflow in chat and editor.

Supported templates:

- shopping website
- ticket booking system
- restaurant ordering website
- hotel booking website
- appointment booking website

## Security Notes

- The core AI flow does not require hardcoded cloud API keys.
- A targeted scan was performed for obvious secrets before documentation update.
- No hardcoded API keys or publishable tokens were found in the source files reviewed.
- Matches seen during scanning were normal auth/session code paths and generated build output, not embedded credentials.

## Current Limitations

- The README does not yet have a committed branded screenshot asset.
- Template-backed website generation is intentionally constrained to common practical/demo site types.
- Question paper board coverage is currently limited to the supported official sources implemented so far.

## Recommended Next Steps

- Add a tracked branded screenshot or animated preview for GitHub documentation
- Expand official board coverage for question papers
- Improve template website post-generation editing heuristics further
- Add tests around student chat persistence and website-generation workflows

## License

MIT
