# LocalGravity

LocalGravity is a privacy-first offline desktop IDE built with Electron, React, TypeScript, and Ollama. It combines a local AI coding assistant with a full student learning mode so the same app can support both developers and school learners without requiring cloud APIs.

## What It Does

- Runs local AI through Ollama instead of remote API services.
- Provides a developer workspace with file explorer, editor tabs, AI chat, live file apply, and local execution.
- Provides a full-screen student workspace with onboarding, chat history, and curriculum-aware tutoring.
- Supports official question paper lookup and analysis for supported boards.
- Uses template-backed website generation for common frontend college-practical requests.

## Modes

### Developer Mode

Developer mode keeps the editor-first workflow intact.

- File explorer and multi-file editing
- AI code generation with `// FILE:` based apply flow
- Live preview of generated files in the editor while streaming
- Local run/output panel for supported file types
- Template-backed frontend generation for common site requests like shopping, booking, hotel, restaurant, and appointment websites
- Auto-open of generated local HTML sites inside the current workspace
- Follow-up modification requests continue through the normal code-editing flow

### Student Mode

Student mode replaces the editor layout with a full-screen learning workspace.

- First-run onboarding for student name, class, and syllabus
- Persistent student profile and student/developer mode toggle
- Full-screen ChatGPT-style learning interface
- Student chat history with reusable past conversations
- Personalized tutoring using class and syllabus context
- Question paper search, retrieval, summary, topic extraction, and difficulty analysis

## Question Paper Support

The current official-source integration includes:

- CBSE previous-year question papers
- Karnataka SSLC official question paper sources
- Karnataka PUC official question paper sources

Question papers are downloaded and cached locally so they can be reused for later requests.

## Website Generation System

For weaker local models, LocalGravity now uses a template-backed generation path for common website requests. This improves reliability for college practical demos while still preserving a code-generation experience in the chat and editor.

Currently supported templates:

- Shopping website
- Ticket booking system
- Restaurant ordering website
- Hotel booking website
- Appointment booking website

Behavior:

- For supported create/build requests, the app streams code generation into chat and the center editor.
- Files are saved directly into the currently opened workspace.
- The generated `index.html` is opened locally after the build completes.
- Follow-up edit requests operate on the created files instead of recreating the template.

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Ollama
- Gemma local models
- better-sqlite3

## Project Structure

```text
electron/                 Main process, IPC handlers, auth, feedback, question papers
src/
  components/             Developer UI, student UI, editor, chat, settings
  services/               Ollama, auth, settings, prebuilt website helpers
  types/                  Shared renderer typings
```

## Getting Started

### Prerequisites

1. Install Node.js
2. Install Ollama from [ollama.com](https://ollama.com/)
3. Pull a local model, for example:

```bash
ollama pull gemma3:4b
```

### Install

```bash
git clone https://github.com/sourabhnirvani/Local-Gravity.git
cd Local-Gravity
npm install
```

### Run In Development

```bash
npm run electron:dev
```

### Build

```bash
npm run electron:build
```

## Privacy And Security

- LocalGravity is designed to use local AI models instead of cloud API calls.
- No API keys are required for the main AI workflow.
- Source review should still be done before distributing production builds.
- Question paper sources are fetched from official board/government pages and cached locally.

## Notes

- The repository currently does not include a committed screenshot asset for the README preview.
- If you want a branded README image, add a tracked image asset and reference it from this file.

## License

MIT
