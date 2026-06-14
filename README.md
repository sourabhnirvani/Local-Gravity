# LocalGravity

LocalGravity is a privacy-first offline desktop IDE built with Electron, React, TypeScript, and Ollama. It combines a local AI coding assistant with a full student learning mode so the same app can support both developers and school learners without requiring cloud APIs.

## What It Does

- Runs local AI through Ollama instead of remote API services.
- Provides a developer workspace with file explorer, editor tabs, AI chat, live file apply, and local execution.
- Features a fully autonomous **Agent Mode** that can proactively read files, write code, and run terminal commands to build your project.
- Provides a full-screen student workspace with onboarding, chat history, and curriculum-aware tutoring.
- Supports official question paper lookup and analysis for supported boards.
- Uses template-backed website generation for common frontend college-practical requests.

## Modes

### Developer Mode & Agent Mode

Developer mode keeps the editor-first workflow intact, now supercharged with a fully autonomous Agent.

- File explorer and multi-file editing
- **Agent Mode**: Toggle on Agent Mode to allow the AI to autonomously invoke tools! The AI can seamlessly read your project directories, read file contents, rewrite code, and execute background terminal commands (e.g. `npm install`, `git push`) to fulfill complex tasks.
- **Pending Changes UI**: When the Agent makes modifications to your project, a Pending Changes bar appears so you can cleanly Accept or Reject the diffs.
- **Agent Step Tracker**: A beautiful dropdown UI that traces every single internal thought and tool execution the agent makes.
- AI code generation with `// FILE:` based apply flow for standard chat.
- Live preview of generated files in the editor while streaming.
- Integrated resizable Terminal and Output panel.

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

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Ollama
- `node-pty` for Integrated Terminal
- `diff` for Pending File Changes

## Project Structure

```text
electron/                 Main process, IPC handlers, terminal integrations, pty
src/
  components/             Developer UI, Agent Step UI, student UI, editor, chat
  services/               Ollama Agent Loop tool-calling pipeline
  types/                  Shared renderer typings
```

## Getting Started

### Prerequisites

1. Install Node.js
2. Install Ollama from [ollama.com](https://ollama.com/)
3. Pull a local model that supports tool calling (e.g., `qwen2.5-coder` or `gemma3:4b`):

```bash
ollama pull gemma3:4b
```

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

To generate the standalone Windows installer executable:

```bash
npm run build
```
