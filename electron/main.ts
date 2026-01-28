import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

// const dev = process.env.NODE_ENV !== 'production';
// For now, we assume dev mode connects to localhost:3000. 
// Production loading needs to be revisited to use static files or a separate server process if needed, 
// but importing 'next' here causes lock conflicts in dev.
const hostname = 'localhost';
const port = 3000;

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hidden', // On macOS, this plus trafficLightPosition works well. On Win/Linux, use frame: false
        // For custom controls on all platforms often 'frame: false' is best, but 'hidden' preserves native styling on mac.
        // Given user request for "custom bar", we go full frameless on non-mac or just hide native.
        // Let's use frame: false for maximum control as requested.
        frame: false,
        backgroundColor: '#111827', // Tailwind gray-900
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Window Control IPCs
    ipcMain.handle('window-minimize', () => mainWindow?.minimize());
    ipcMain.handle('window-maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.handle('window-close', () => mainWindow?.close());


    // In dev, load the Next.js dev server which is already running via 'npm run dev:next'
    try {
        await mainWindow.loadURL(`http://${hostname}:${port}`);
        mainWindow.webContents.openDevTools();
    } catch (e) {
        console.error('Failed to load local dev server:', e);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}


app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers
import { setupSSHHandlers } from './services/ssh';
import { setupSFTPHandlers } from './services/sftp';

setupSSHHandlers();
setupSFTPHandlers();

// Example handler (can be removed later)
ipcMain.handle('connect-ssh', async (event, config) => {
    console.log('Connecting SSH...', config);
    // Implementation in services/ssh.ts
    return { success: true, message: 'Connected (Mock)' };
});
