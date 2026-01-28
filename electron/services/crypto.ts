import { safeStorage } from 'electron';

export const cryptoService = {
    isAvailable: () => safeStorage.isEncryptionAvailable(),

    encrypt: (text: string): string => {
        if (!safeStorage.isEncryptionAvailable()) {
            // Fallback for dev/testing on systems without safeStorage (e.g. headless Linux without keychain)
            // In production, this should throw or handle appropriately.
            console.warn('SafeStorage not available, falling back to base64 (INSECURE - DEV ONLY)');
            return Buffer.from(text).toString('base64');
        }
        return safeStorage.encryptString(text).toString('base64');
    },

    decrypt: (encryptedBase64: string): string => {
        if (!safeStorage.isEncryptionAvailable()) {
            return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
        }
        try {
            const buffer = Buffer.from(encryptedBase64, 'base64');
            return safeStorage.decryptString(buffer);
        } catch (error) {
            console.error('Failed to decrypt:', error);
            return '';
        }
    },
};
