import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-for-jest-tests';

// Patch process.env.JWT_SECRET before tests use getJwtSecret()
process.env.JWT_SECRET = TEST_JWT_SECRET;

export function generateTestToken(userId: string, expiresIn: string | number = '7d'): string {
  return jwt.sign({ id: userId }, TEST_JWT_SECRET, { expiresIn } as any);
}

export function generateExpiredToken(userId: string): string {
  return jwt.sign({ id: userId }, TEST_JWT_SECRET, { expiresIn: '-1s' } as any);
}

export const AUTH_HEADER = (userId: string) => ({
  Authorization: `Bearer ${generateTestToken(userId)}`,
});
