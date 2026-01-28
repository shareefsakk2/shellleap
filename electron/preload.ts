import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) =>
        ipcRenderer.on(channel, listener),
    off: (channel: string, listener: (...args: any[]) => void) =>
        ipcRenderer.removeListener(channel, listener),
    storageRead: (key: string) => ipcRenderer.invoke('storage-read', key),
    storageWrite: (key: string, value: any) => ipcRenderer.invoke('storage-write', key, value),
    pathSep: process.platform === 'win32' ? '\\' : '/',
});
