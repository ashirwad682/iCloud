import crypto from 'crypto';

let argon2Module: any = null;
try {
  argon2Module = require('argon2');
} catch {
  // Use built-in crypto.scrypt fallback
}


export class CryptoUtil {
  /**
   * Hashes a password using Argon2id or built-in crypto.scrypt.
   */
  static async hashPassword(password: string): Promise<string> {
    if (argon2Module) {
      try {
        return await argon2Module.hash(password, {
          type: argon2Module.argon2id,
          memoryCost: 2 ** 16, // 64 MB
          timeCost: 3,
          parallelism: 1,
        });
      } catch {
        // Fallback to scrypt
      }
    }

    // Built-in scrypt fallback (zero native dependencies, 100% reliable)
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies an Argon2id or scrypt password hash.
   */
  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      if (hash.startsWith('$scrypt$')) {
        const parts = hash.split('$');
        const salt = parts[2];
        const key = parts[3];
        return new Promise((resolve) => {
          crypto.scrypt(plain, salt, 64, (err, derivedKey) => {
            if (err) return resolve(false);
            resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
          });
        });
      }

      if (argon2Module) {
        return await argon2Module.verify(hash, plain);
      }
      return false;
    } catch {
      return false;
    }
  }


  /**
   * Generates a cryptographically secure random token (hex or url-safe base64).
   */
  static generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generates a set of 10 alphanumeric backup recovery codes for 2FA.
   */
  static generateRecoveryCodes(count: number = 10): { raw: string[]; hashed: Promise<string[]> } {
    const rawCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
      rawCodes.push(formatted);
    }

    const hashed = Promise.all(rawCodes.map((code) => CryptoUtil.hashString(code)));

    return { raw: rawCodes, hashed };
  }

  /**
   * Fast SHA-256 string hash for tokens and recovery code matching.
   */
  static hashString(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Computes SHA-256 checksum from a buffer.
   */
  static computeChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
