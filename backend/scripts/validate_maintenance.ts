import axios from 'axios';
import 'dotenv/config';

const API_URL = 'http://localhost:3333/api';

async function validateMaintenance() {
  console.log('\n--- 🧪 Iniciando Teste de Manutenção (Risco Zero) ---\n');

  const scenarios = [
    { name: 'Tentando Logar', path: '/auth/login', method: 'post' },
    { name: 'Tentando se Cadastrar', path: '/auth/register', method: 'post' },
    { name: 'Cliente Logado (Dashboard)', path: '/reservations', method: 'get' },
    { name: 'Vitrine Pública (Disponibilidade)', path: '/public/properties/teste/availability', method: 'get' },
    { name: 'Exceção: Config. Pública', path: '/public/config', method: 'get', shouldBeOpen: true },
  ];

  for (const scenario of scenarios) {
    try {
      const response = await (axios as any)[scenario.method](`${API_URL}${scenario.path}`, {});
      
      if (scenario.shouldBeOpen) {
        if (response.data.isMaintenanceMode === true) {
          console.log(`✅ ${scenario.name}: Aberta com Sucesso (Indica Manutenção: true)`);
        } else {
          console.log(`⚠️ ${scenario.name}: Aberta, mas reporta Manutenção como FALSE.`);
        }
      } else {
        console.log(`❌ ${scenario.name}: FALHOU - A rota deveria estar bloqueada!`);
      }
    } catch (error: any) {
      if (error.response?.status === 503) {
        console.log(`✅ ${scenario.name}: Bloqueada corretamente (Status 503 - Service Unavailable)`);
      } else {
        console.log(`❌ ${scenario.name}: Erro inesperado - Status ${error.response?.status || 'Sem Resposta'}`);
      }
    }
  }

  console.log('\n--- Fim do Teste ---\n');
}

validateMaintenance();
