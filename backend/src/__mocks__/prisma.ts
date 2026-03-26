// Manual mock for prisma module
// Used via jest.mock('../prisma') in tests

const createMockModel = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
});

export const prisma = {
  user: createMockModel(),
  property: createMockModel(),
  tenant: createMockModel(),
  reservation: createMockModel(),
  payment: createMockModel(),
  contractDraft: createMockModel(),
  calendarSync: createMockModel(),
  npsResponse: createMockModel(),
  cesResponse: createMockModel(),
  subscriptionHistory: createMockModel(),
  cancellationFeedback: createMockModel(),
  campaign: createMockModel(),
  termsVersion: createMockModel(),
  userTermsAcceptance: createMockModel(),
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};
