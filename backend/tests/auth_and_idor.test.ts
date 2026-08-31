import { CryptoUtil } from '../src/common/utils/crypto';

describe('CloudVault Security & Cryptographic Verifications', () => {
  test('Argon2id password hashing produces valid hash and verifies correctly', async () => {
    const rawPassword = 'SuperSecurePassword2026!';
    const hash = await CryptoUtil.hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isValid = await CryptoUtil.verifyPassword(hash, rawPassword);
    expect(isValid).toBe(true);

    const isWrongValid = await CryptoUtil.verifyPassword(hash, 'WrongPassword123');
    expect(isWrongValid).toBe(false);
  });

  test('Generates 10 valid 2FA backup recovery codes with secure SHA-256 hashes', async () => {
    const { raw, hashed } = CryptoUtil.generateRecoveryCodes(10);
    const resolvedHashed = await hashed;

    expect(raw.length).toBe(10);
    expect(resolvedHashed.length).toBe(10);

    // Verify first code against its corresponding hash
    const firstCode = raw[0];
    const expectedHash = CryptoUtil.hashString(firstCode);
    expect(resolvedHashed[0]).toBe(expectedHash);
  });

  test('Computes consistent SHA-256 checksums from binary buffers', () => {
    const bufferA = Buffer.from('CloudVault Test Binary Content 1');
    const bufferB = Buffer.from('CloudVault Test Binary Content 1');
    const bufferC = Buffer.from('CloudVault Test Binary Content 2');

    const checksumA = CryptoUtil.computeChecksum(bufferA);
    const checksumB = CryptoUtil.computeChecksum(bufferB);
    const checksumC = CryptoUtil.computeChecksum(bufferC);

    expect(checksumA).toBe(checksumB);
    expect(checksumA).not.toBe(checksumC);
  });
});
