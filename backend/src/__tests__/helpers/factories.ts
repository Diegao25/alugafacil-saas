import { v4 as uuidv4 } from 'uuid';

const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

export const makeUser = (overrides = {}) => ({
  id: uuidv4(),
  nome: 'Test User',
  email: 'test@example.com',
  senha: '$2b$10$hashedpassword',
  cpf_cnpj: null,
  telefone: null,
  endereco: null,
  is_admin: true,
  owner_user_id: null,
  plan_type: 'trial',
  trial_start_date: new Date(),
  trial_end_date: futureDate,
  subscription_status: 'trial_active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan_name: null,
  subscription_date: null,
  subscription_amount: null,
  payment_method: null,
  cancellation_date: null,
  access_until: null,
  reset_token: null,
  reset_token_expires: null,
  data_criacao: new Date(),
  login_count: 0,
  ...overrides,
});

export const makeProperty = (overrides = {}) => ({
  id: uuidv4(),
  nome: 'Casa de Praia',
  endereco: 'Rua do Mar, 123',
  descricao: 'Bela casa na praia',
  valor_diaria: 200,
  capacidade_maxima: 8,
  redes_sociais_url: null,
  foto_principal: null,
  comodidades: 'Wi-Fi, Piscina',
  usuario_id: 'owner-123',
  data_criacao: new Date(),
  ...overrides,
});

export const makeTenant = (overrides = {}) => ({
  id: uuidv4(),
  nome: 'João Silva',
  cpf: '529.982.247-25', // valid CPF
  telefone: '(11) 99999-9999',
  email: 'joao@example.com',
  endereco: 'Rua A, 1',
  observacoes: null,
  usuario_id: 'owner-123',
  ...overrides,
});

export const makeReservation = (overrides = {}) => ({
  id: uuidv4(),
  imovel_id: 'property-123',
  locatario_id: 'tenant-123',
  data_checkin: new Date('2026-06-01T12:00:00Z'),
  hora_checkin: '12:00',
  data_checkout: new Date('2026-06-08T12:00:00Z'),
  hora_checkout: '12:00',
  valor_total: 1400,
  status: 'Pendente',
  external_id: null,
  provider: null,
  ...overrides,
});

export const makePayment = (overrides = {}) => ({
  id: uuidv4(),
  reserva_id: 'reservation-123',
  valor: 1400,
  tipo: 'Total',
  status: 'Pendente',
  data_vencimento: null,
  data_pagamento: null,
  meio_pagamento: null,
  ...overrides,
});

export const makeContractDraft = (overrides = {}) => ({
  id: uuidv4(),
  reserva_id: 'reservation-123',
  content: 'Conteúdo do contrato de teste',
  data_criacao: new Date(),
  data_atualizacao: new Date(),
  ...overrides,
});

export const VALID_CPF = '529.982.247-25';
export const STRONG_PASSWORD = 'Senha123';
