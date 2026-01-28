# ShellLeap

![ShellLeap Logo](landing-page/public/logo.png)

> **A beautiful, high-performance SSH & SFTP client with persistent sessions, secure keychain, and effortless tunneling.**

ShellLeap is a next-generation terminal and file manager designed for modern DevOps workflows. Built with Electron, Next.js, and TypeScript, it transforms server management from a CLI chore into a seamless, visual experience.

## ✨ Features

*   **🚀 Persistent Sessions**: Your workspace stays alive. Switch tabs, navigate the app, or restart the client—your SSH sessions resume exactly where you left them, preserving context and history.
*   **📂 Integrated Visual SFTP**: A full-fidelity file manager lives right next to your terminal. Drag-and-drop file transfers are implicitly connected with every session—no extra login required.
*   **🔐 Smart Keychain**: Securely manage identities (SSH keys, passwords). Map a single identity to multiple hosts and update credentials in one place.
*   **🚇 Effortless Tunneling**: Configure Jump Hosts (Bastion) and complex port forwarding in seconds. Access private databases and internal services without the configuration headache.
*   **🎨 Premium Dark UI**: A distraction-free, glassmorphic interface designed for focus and clarity during long coding sessions.

## 💻 Cross-Platform Support

ShellLeap is built to run everywhere you work:
*   **🐧 Linux**: Available as `.deb` and `.AppImage`.
*   **🍎 macOS**: Native `.dmg` support (Intel & Apple Silicon).
*   **🪟 Windows**: Portable `.exe` setup.

Download the latest version for your platform from the [Releases Page](https://github.com/shareefsakk2/shellleap/releases).

## 🛠️ Technology Stack

*   **Runtime**: [Electron](https://www.electronjs.org/) (Main Process)
*   **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS
*   **State Management**: Zustand (with distinct stores for Hosts, Identities, and Sessions)
*   **SSH Core**: `ssh2` and `ssh2-sftp-client` for robust protocol handling
*   **Terminal**: xterm.js for a full-featured terminal emulation

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/shareefsakk2/shellleap.git
    cd shellleap
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # Also install landing page deps if you want to work on the site
    cd landing-page && npm install && cd ..
    ```

3.  **Run Development Mode**
    Start both the Next.js renderer and the Electron main process concurrently:
    ```bash
    npm run dev
    ```
    *   The app window should appear shortly.
    *   Hot Reloading is enabled for both the React UI and Electron main process.

### Building for Production

To create a distributable package for your specific OS:

```bash
# General production build
npm run build

# Package for all platforms
npx electron-builder build --linux --macos --windows
```

This will:
1.  Build the Next.js app (static export).
2.  Compile the Electron TypeScript code.
3.  Package the application into `.deb`, `.AppImage`, `.dmg`, or `.exe` formats based on your configuration.

## 🤝 Contributing

Contributions are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for Developers
</p>
