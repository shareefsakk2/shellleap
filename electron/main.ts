import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupSSHHandlers } from './services/ssh';
import { setupSFTPHandlers } from './services/sftp';
import { setupStorageHandlers } from './services/storage';

// Register custom protocol for production
if (app.isPackaged) {
    protocol.registerSchemesAsPrivileged([
        { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
    ]);
}

// Fix for Linux rendering issues (Wayland/Vulkan)
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
    app.commandLine.appendSwitch('disable-gpu-vulkan');
}

const hostname = 'localhost';
const port = 3000;

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
    // Handle the custom protocol in production
    if (app.isPackaged) {
        protocol.handle('app', async (request) => {
            const url = new URL(request.url);
            let relativePath = url.pathname;

            // Normalize path
            if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
            }

            const outDir = path.join(__dirname, '../../out');
            let filePath = path.join(outDir, relativePath);

            // Handle directory paths by appending index.html
            // If trailingSlash is true, Next.js outputs /path/index.html
            // The browser request might be /path/
            try {
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        filePath = path.join(filePath, 'index.html');
                    }
                } else {
                    // If file doesn't exist, try adding .html or /index.html
                    if (fs.existsSync(filePath + '.html')) {
                        filePath += '.html';
                    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
                        filePath = path.join(filePath, 'index.html');
                    }
                }

                if (!fs.existsSync(filePath)) {
                    console.error('File not found in protocol handler:', filePath);
                    return new Response('Not Found', { status: 404 });
                }

                const content = fs.readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase();

                let contentType = 'text/html';
                if (ext === '.js') contentType = 'text/javascript';
                else if (ext === '.css') contentType = 'text/css';
                else if (ext === '.svg') contentType = 'image/svg+xml';
                else if (ext === '.png') contentType = 'image/png';
                else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                else if (ext === '.woff2') contentType = 'font/woff2';
                else if (ext === '.json') contentType = 'application/json';

                return new Response(content, {
                    headers: { 'Content-Type': contentType }
                });
            } catch (e) {
                console.error('Protocol error:', e, 'Path:', filePath);
                return new Response('Error', { status: 500 });
            }
        });
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hidden',
        frame: false,
        backgroundColor: '#111827',
        show: false, // Don't show until ready
        icon: path.join(__dirname, '../../build/icon.png'), // Explicitly set icon
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
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


    // Load content
    if (!app.isPackaged) {
        // In dev, load the Next.js dev server
        try {
            await mainWindow.loadURL(`http://${hostname}:${port}`);
            mainWindow.webContents.openDevTools();
        } catch (e) {
            console.error('Failed to load local dev server:', e);
        }
    } else {
        // In production, load using our custom app:// protocol
        try {
            await mainWindow.loadURL('app://local/index.html');
            // We can leave DevTools open for troubleshooting since you reported issues
            // mainWindow.webContents.openDevTools();
        } catch (e) {
            console.error('Failed to load local file:', e);
        }
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}


app.on('ready', () => {
    // Initialize IPC handlers once app is ready
    setupSSHHandlers();
    setupSFTPHandlers();
    setupStorageHandlers();

    createWindow();
});

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
