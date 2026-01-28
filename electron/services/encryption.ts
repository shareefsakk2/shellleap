import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

export interface EncryptedData {
    iv: string;
    salt: string;
    data: string;
    tag: string;
}

export class EncryptionService {
    private masterKey: Buffer | null = null;

    setMasterPassword(password: string) {
        // Derive a key from the password using a static but unique-ish salt for the derivation itself
        // if we don't have a per-file salt yet. 
        // For standard AES-GCM we derive a new key for each encryption with its own salt.
    }

    deriveKey(password: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    }

    encrypt(text: string, password: string): EncryptedData {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = this.deriveKey(password, salt);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag().toString('hex');

        return {
            iv: iv.toString('hex'),
            salt: salt.toString('hex'),
            data: encrypted,
            tag: tag
        };
    }

    decrypt(encrypted: EncryptedData, password: string): string {
        const salt = Buffer.from(encrypted.salt, 'hex');
        const iv = Buffer.from(encrypted.iv, 'hex');
        const tag = Buffer.from(encrypted.tag, 'hex');
        const key = this.deriveKey(password, salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // Helper to check if a password is correct by trying to decrypt a known string
    validatePassword(encryptedValidation: EncryptedData, password: string): boolean {
        try {
            const decrypted = this.decrypt(encryptedValidation, password);
            return decrypted === 'SHELL-LEAP-VALID';
        } catch (e) {
            return false;
        }
    }

    createValidation(password: string): EncryptedData {
        return this.encrypt('SHELL-LEAP-VALID', password);
    }
}

export const encryptionService = new EncryptionService();
