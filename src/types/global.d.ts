export { };

declare global {
    interface Window {
        electron: {
            invoke: (channel: string, ...args: any[]) => Promise<any>;
            send: (channel: string, ...args: any[]) => void;
            on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
            off: (channel: string, listener: (...args: any[]) => void) => void;
            storageRead: (key: string) => Promise<any>;
            storageWrite: (key: string, value: any) => Promise<boolean>;
        };
    }
}
