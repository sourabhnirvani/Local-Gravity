# LocalGravity - AI-Powered Offline IDE 🚀

LocalGravity is a desktop IDE application similar to Cursor/VS Code that uses **local AI** (running entirely on the user's computer) instead of cloud services. It ensures complete privacy and offline functionality, making it ideal for users with limited internet access or strict data privacy requirements.

![LocalGravity](https://placehold.co/600x400?text=LocalGravity+Preview) *(Replace with actual screenshot)*

## 🌟 Key Features

- **100% Offline AI:** Powered by Gemma 3:4B via Ollama, running locally on your machine.
- **Privacy-First:** Your code never leaves your computer. No cloud uploads, no tracking.
- **Zero Cost:** Free forever. No subscriptions or API fees.
- **Familiar Interface:** VS Code-like experience with file explorer, tabs, and syntax highlighting.
- **Smart Assistance:** Chat with AI to generate code, debug issues, and explain concepts.
- **Optimized Performance:** Fast file system operations and low resource usage.

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Electron (Main Process) + Node.js
- **AI Engine:** Ollama + Gemma 3:4B Model
- **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites

1.  **Node.js:** Ensure Node.js is installed on your system.
2.  **Ollama:** Download and install [Ollama](https://ollama.com/).
3.  **Gemma Model:** Pull the Gemma 3:4B model using Ollama:
    ```bash
    ollama pull gemma:4b
    ```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sourabhnirvani/Local-Gravity.git
    cd Local-Gravity
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in development mode:**
    ```bash
    npm run electron:dev
    ```

4.  **Build for production:**
    ```bash
    npm run electron:build
    ```

## 🌍 Social Impact

LocalGravity bridges the digital divide for students in rural and underdeveloped areas by providing:
- **Offline Access:** reliable coding tools without needing constant internet.
- **Free Education:** Unlimited AI mentorship without expensive subscriptions.
- **Privacy:** Safe environment to experiment and learn without data concerns.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ by Sourabh Nirvani**
