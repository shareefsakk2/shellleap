# 🚀 ShellLeap v0.1.3 - Power User Features & Refinements

Welcome to **ShellLeap v0.1.3**! This release brings a suite of powerful tab management features, terminal enhancements, and critical UX fixes to streamline your workflow.

### ✨ What's New
*   **📂 Advanced Tab Management**:
    *   **Context Menu**: Right-click tabs to Duplicate or quickly switch between SSH/SFTP.
    *   **Drag & Drop**: Reorder your session tabs with a smooth, intuitive interface.
    *   **Wheel Scrolling**: Experience effortless navigation with horizontal mouse wheel support for the tab bar.
*   **💻 Terminal Power-Ups**:
    *   **Bottom-Up Search**: Terminal search now starts from your current position (bottom) for instant context.
    *   **Match Count**: Know exactly where you are with "X of Y" match indicators.
    *   **Massive Buffers**: Increased re-attachment buffer to 5MB and scrollback to 10,000 lines for heavy-duty sessions.
*   **🛠️ SFTP Path Validation**: Added smart path handling that reverts to the last known valid directory on input errors, preventing navigation loss.
*   **📍 View Persistence**: Host page scroll position is now remembered, so you don't lose your place when switching views.

### 🛠️ Fixes & Improvements
*   **Dynamic Versioning**: The app version is now fetched dynamically, ensuring accuracy in the status bar.
*   **Keychain Cleanup**: Removed redundant username fields from the Identity model to simplify credential management.
*   **Host Creation Fix**: Resolved an issue where "Add Host to Group" incorrectly entered edit mode.

### 📦 Installation
- **Windows**: Download and run the `.exe` installer.
- **macOS**: Download the `.dmg`, open it, and drag ShellLeap to your Applications folder.
- **Linux**: Download the `.deb` and install via `sudo apt install ./shell-leap_0.1.3_amd64.deb`.

---

# 🚀 ShellLeap v0.1.2 - UI Polish & Quality of Life

We're thrilled to release **ShellLeap v0.1.2**, focused on visual refinements and usability improvements across the application.

### ✨ What's New
*   **🔍 Search in Hosts & Keychain**: Added search inputs to quickly filter hosts by label/address and identities by label/username.
*   **📊 Host Connection Status**: Host cards now display a dynamic "Connected" or "Idle" badge based on active sessions.
*   **🎨 Grayscale App Icons**: Unified visual style with grayscale logo in sidebar, unlock screen, and system tray.
*   **📐 Tray Icon Padding**: Reduced tray icon size with transparent padding for a cleaner system tray appearance.

### 🛠️ Fixes & Improvements
*   **➕ Plus Button Menu**: Fixed context menu overflow when positioned near screen edge.
*   **🔐 Unlock Screen Polish**: Updated app name styling to use monospace font matching sidebar branding.
*   **🎯 Sidebar Refinements**: Improved spacing and visual consistency throughout the sidebar.

### 📦 Installation
- **Windows**: Download and run the `.exe` installer.
- **macOS**: Download the `.dmg`, open it, and drag ShellLeap to your Applications folder.
- **Linux**: Download the `.deb` and install via `sudo apt install ./shell-leap_0.1.2_amd64.deb`.

---

# 🚀 ShellLeap v0.1.1 - The Cross-Platform Evolution

We are excited to announce **ShellLeap v0.1.1**, a major milestone that brings native support to all major desktop operating systems and significant stability improvements to our core services.

### ✨ What's New
*   **💻 native Cross-Platform Support**: ShellLeap is now officially available for **Windows (EXE)**, **macOS (DMG)**, and **Linux (DEB/AppImage)**.
*   **🎨 High-Fidelity Branding**: Added professional, high-resolution icons across all platforms for a premium desktop experience.
*   **📂 Windows SFTP Native Pathing**: Completely refactored the local file system layer to handle Windows paths, drive letters, and backslashes natively. No more broken "Go Up" navigation!
*   **🔄 Smarter Remote Navigation**: Fixed a critical issue where the local file path would reset when browsing remote server directories.
*   **🛡️ Enhanced Stability**: Resolved Windows-specific build errors (`ERR_UNSUPPORTED_ESM_URL_SCHEME`) and optimized the CI/CD pipeline for faster, more reliable releases.

### 🌐 UI & Experience
*   **📱 Mobile-Responsive Landing Page**: Our home on the web now features a premium, glassmorphic mobile navigation menu.
*   **🚀 Dynamic OS Detection**: The website now automatically detects your operating system and highlights the correct download for you.
*   **🎯 Brand Continuity**: Synchronized our "ShellLeap" multicolor branding and accent underlines across the application and landing page.

### 📦 Installation
- **Windows**: Download and run the `.exe` installer.
- **macOS**: Download the `.dmg`, open it, and drag ShellLeap to your Applications folder.
- **Linux**: Download the `.deb` and install via `sudo apt install ./shell-leap_0.1.1_amd64.deb`.

---
*Thank you for supporting ShellLeap. We're bridging the gap between your local machine and your remote servers, one platform at a time.*
