import { ipcMain, app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { encryptionService, EncryptedData } from './encryption';

const DATA_DIR = app.getPath('userData');
const VAULT_KEY_PATH = path.join(DATA_DIR, 'vault.key');
const VAULT_LOCK_PATH = path.join(DATA_DIR, 'vault.lock');

let masterPassword = '';

function initVault() {
    try {
        console.log('[Security] Initializing Vault...');
        if (fs.existsSync(VAULT_KEY_PATH)) {
            console.log('[Security] Vault key found. Checking encryption availability...');
            if (safeStorage.isEncryptionAvailable()) {
                const encryptedKey = fs.readFileSync(VAULT_KEY_PATH);
                masterPassword = safeStorage.decryptString(encryptedKey);
                console.log('[Security] Vault auto-unlocked via system keychain.');
            } else {
                console.warn('[Security] System keychain (safeStorage) not available on this environment.');
            }
        } else {
            console.log('[Security] No vault key found. Setup required.');
        }
    } catch (e) {
        console.error('[Security] Failed to auto-unlock vault:', e);
    }
}

export function setupStorageHandlers() {
    initVault();

    ipcMain.handle('security-get-status', () => {
        const isEncrypted = fs.existsSync(VAULT_LOCK_PATH);
        const status = {
            isEncrypted,
            isUnlocked: masterPassword !== ''
        };
        console.log(`[Security] Status requested: ${JSON.stringify(status)}`);
        return status;
    });

    ipcMain.handle('security-set-password', (_, password: string) => {
        console.log('[Security] Setting/Verifying master password...');
        if (!fs.existsSync(VAULT_LOCK_PATH)) {
            // Initial One-Time Setup
            console.log('[Security] Initial setup detected.');
            const validation = encryptionService.createValidation(password);
            fs.writeFileSync(VAULT_LOCK_PATH, JSON.stringify(validation));

            // Persist the key securely in OS Keychain so we don't ask again
            if (safeStorage.isEncryptionAvailable()) {
                console.log('[Security] Persisting key to system keychain...');
                const encryptedKey = safeStorage.encryptString(password);
                fs.writeFileSync(VAULT_KEY_PATH, encryptedKey);
                console.log('[Security] Key persisted successfully.');
            } else {
                console.warn('[Security] safeStorage not available. Key will NOT be persisted for auto-unlock.');
            }

            masterPassword = password;
            return { success: true };
        } else {
            // Verify existing (Internal/Fallback)
            console.log('[Security] Verification of existing password required.');
            const validation = JSON.parse(fs.readFileSync(VAULT_LOCK_PATH, 'utf-8'));
            if (encryptionService.validatePassword(validation, password)) {
                masterPassword = password;

                // If we successfully unlocked manually, let's "Remember" it now for next time
                if (safeStorage.isEncryptionAvailable()) {
                    console.log('[Security] Unlocked manually. Persisting key to system keychain for next time.');
                    const encryptedKey = safeStorage.encryptString(password);
                    fs.writeFileSync(VAULT_KEY_PATH, encryptedKey);
                }

                return { success: true };
            }
            console.error('[Security] Invalid password provided.');
            return { success: false, error: 'Invalid password' };
        }
    });

    ipcMain.handle('storage-read', async (_, key: string) => {
        try {
            const filePath = path.join(DATA_DIR, `${key}.json`);
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');

                // If the data looks like our EncryptedData structure, try to decrypt
                if (masterPassword && raw.includes('"iv"') && raw.includes('"tag"')) {
                    try {
                        const encrypted = JSON.parse(raw) as EncryptedData;
                        const decrypted = encryptionService.decrypt(encrypted, masterPassword);
                        return JSON.parse(decrypted);
                    } catch (e) {
                        console.error(`[Storage] Decryption failed for ${key}:`, e);
                        // Fallback to raw parse if it wasn't actually encrypted
                        return JSON.parse(raw);
                    }
                }

                return JSON.parse(raw);
            }
            return null;
        } catch (error) {
            console.error(`[Storage] Failed to read key ${key}:`, error);
            return null;
        }
    });

    ipcMain.handle('storage-write', async (_, key: string, value: any) => {
        try {
            const filePath = path.join(DATA_DIR, `${key}.json`);
            let content = JSON.stringify(value, null, 2);

            if (masterPassword && (key.includes('host') || key.includes('identity'))) {
                const encrypted = encryptionService.encrypt(content, masterPassword);
                content = JSON.stringify(encrypted, null, 2);
            }

            fs.writeFileSync(filePath, content);
            return true;
        } catch (error) {
            console.error(`[Storage] Failed to write key ${key}:`, error);
            return false;
        }
    });
}
