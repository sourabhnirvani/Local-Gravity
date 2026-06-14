<div align="center">

  # 🌌 LocalGravity

  **A beautifully designed, privacy-first offline desktop IDE built with Electron, React, TypeScript, and Ollama.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Built with Electron](https://img.shields.io/badge/Electron-191970?logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![Built with React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Powered by Ollama](https://img.shields.io/badge/Ollama-Local_AI-FF5722?logo=ollama&logoColor=white)](https://ollama.com/)

  *LocalGravity is a completely offline local AI coding assistant and IDE, giving you the power of an autonomous coding agent directly on your local machine without requiring any paid cloud APIs!*

</div>

---

## ✨ Key Features

- **🔒 100% Private & Local:** Runs entirely on your machine through Ollama. No remote APIs, no telemetry, no subscription fees.
- **🛠️ Powerful Developer Workspace:** A complete IDE featuring a file explorer, multi-tab editor, AI chat, live file-apply, and integrated terminal.
- **🤖 Autonomous Agent Mode:** A supercharged AI agent that can proactively read files, rewrite code, and run terminal commands to build your project from scratch.

---

## 💻 Developer Mode & Agent Workflow

LocalGravity keeps the editor-first workflow intact while supercharging it with a fully autonomous AI Agent.

### 🚀 The Autonomous Agent
Toggle on **Agent Mode** to give the AI the reins! The Agent can seamlessly:
- Read your project directories and specific file contents.
- Rewrite and edit your code intelligently.
- Execute background terminal commands (e.g., `npm install`, `git status`) to fulfill complex tasks.

### 🔍 Unprecedented Transparency
- **Pending Changes UI:** When the Agent makes modifications, a sleek bar appears at the bottom. Easily review the file diffs and **Accept** or **Reject** the changes cleanly.
- **Agent Step Tracker:** A beautiful dropdown UI traces every single internal "thought" and tool execution the agent makes. You're always in control!

### ⚡ Seamless IDE Integration
- Integrated `node-pty` powered Terminal and Output panel.
- Live preview of generated files in the editor while streaming.
- `// FILE:` based apply flow for standard conversational code generation.

---

## 🛠️ Tech Stack

LocalGravity is built with a modern, high-performance web and desktop stack:

* **Core Framework:** [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **AI Engine:** [Ollama](https://ollama.com/) (e.g., `gemma3:4b`, `qwen2.5-coder`)
* **Terminal:** `node-pty` for the integrated PTY terminal
* **Diff Engine:** `diff` library for the Pending File Changes UI

---

## 🚀 Getting Started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v18+ recommended)
2. Install [Ollama](https://ollama.com/)
3. Pull a local model that supports tool calling (we recommend `gemma3:4b` or `qwen2.5-coder`):

```bash
ollama pull gemma3:4b
```

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sourabhnirvani/Local-Gravity.git
cd Local-Gravity
npm install
```

### Development

To start the Vite dev server and launch the Electron app with hot-reloading:

```bash
npm run dev
```

### Production Build

To generate a standalone Windows installer executable (`.exe`):

```bash
npm run build
```
*The output setup file will be located in the `release/` directory!*

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/sourabhnirvani">Sourabh Nirvani</a>
</div>
