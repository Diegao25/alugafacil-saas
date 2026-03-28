import { Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret-123';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';

describe('Google Auth Controller Unit Test', () => {
  let googleLogin: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let prismaMock: any;

  beforeEach(() => {
    jest.resetModules();
    
    // Mock do Prisma
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };
    jest.doMock('../prisma', () => ({ prisma: prismaMock }));

    // Mock das utilitários para evitar dependências profundas
    jest.doMock('../utils/owner', () => ({
      canManageUsers: jest.fn().mockResolvedValue(true)
    }));
    
    jest.doMock('../utils/terms', () => ({
      getTermsStatus: jest.fn().mockResolvedValue({
        termsPending: false,
        currentTermsVersion: 'v1',
        acceptedTermsVersion: 'v1'
      })
    }));

    // Mock do Google Auth
    const mockVerifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'test-google@example.com',
        name: 'Test Google User',
        sub: 'google-sub-123'
      })
    });

    jest.doMock('google-auth-library', () => ({
      OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken
      }))
    }));

    // Re-importa o controller após os mocks estarem configurados
    googleLogin = require('../controllers/googleAuth.controller').googleLogin;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: { credential: 'valid-token' }
    };
    res = {
      status: statusMock,
      cookie: jest.fn()
    };
  });

  it('deve retornar token e inicializar campos para novo usuário Google', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-google-123',
      email: 'test-google@example.com',
      nome: 'Test Google User',
      plan_type: 'trial',
      subscription_status: 'trial_active',
      is_admin: true
    });

    await googleLogin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).toHaveProperty('token');
    expect(responseBody.isNewUser).toBe(true);
    
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        cpf_cnpj: '',
        telefone: '',
        endereco: '',
        login_count: 1
      })
    }));
  });

  it('deve retornar token para usuário Google existente', async () => {
    const existingUser = {
      id: 'existing-google-123',
      email: 'test-google@example.com',
      nome: 'Existing Guest',
      plan_type: 'regular',
      subscription_status: 'active',
      is_admin: true
    };

    prismaMock.user.findUnique.mockResolvedValue(existingUser);
    prismaMock.user.update.mockResolvedValue(existingUser);

    await googleLogin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).toHaveProperty('token');
    expect(responseBody.isNewUser).toBe(false);
    expect(responseBody.user).toHaveProperty('subscription_status', 'active');
    expect(responseBody.user).toHaveProperty('plan_name');
    expect(responseBody.user).toHaveProperty('access_until');
  });
});
