# Deploy no Railway

Este repositório contém dois serviços principais:
- **backend/**: API Express/TypeScript que usa Prisma + PostgreSQL.
- **web/**: aplicação Next.js/React que consome a API e roda no domínio público.

## Como o Railway está configurado hoje
- O `railway.json` na raiz já cuida do **web**: faz `cd web && npm install && npm run build` e depois `cd web && npm start`.
- Para que o backend também seja buildado e iniciado automaticamente, há um `railway.json` dedicado dentro de `backend/` (veja abaixo).

## Novo serviço backend no Railway
Crie um serviço separado (ou adicione à stack existente) que aponte para `backend/railway.json` com esta estrutura:

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm start"
  }
}
```

Assim a API será compilada (Prisma + TypeScript) e servirá o mesmo ambiente de produção que o resto da stack já usa.

## Variáveis de ambiente necessárias
### Backend
| Nome | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL usada pelo Prisma. |
| `JWT_SECRET` | Chave de assinatura dos tokens JWT usados nos middlewares; tem fallback local, mas defina algo seguro. |
| `STRIPE_SECRET_KEY` | Credencial de API para criar cobranças/assinaturas. |
| `STRIPE_WEBHOOK_SECRET` | Verifica os webhooks recebidos do Stripe. |
| `RESEND_API_KEY` | API key do Resend usada para enviar e-mails. |
| `FRONTEND_URL` | URL pública do front usada nos links de checkout e recuperação de senha. |
| `API_BASE_URL` | (opcional) URL base esperada para geração de contratos; se não definida, usa `http://localhost:${process.env.PORT || 3333}`. |
| `WEB_BASE_URL` | (opcional) usada como fallback para `FRONTEND_URL` em alguns controladores. |
| `PORT` | Porta que o Express escuta; o Railway define automaticamente, mas você pode sobrescrever. |

### Frontend
| Nome | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL pública da API (ex.: `https://alugafacil-backend-production.up.railway.app`). É o valor que o `api.ts` usa para montar as chamadas. |

## Fluxo de deploy via Git + Railway
1. Confirme que os arquivos estão corretos (`git status`). Ignore o `backend/prisma/dev.db`, pois é um banco local que não deve ir para o Git (adicione-o ao `.gitignore`, se ainda não estiver).
2. Faça `git add .` e depois `git commit -m "<mensagem clara>"` (ex.: `fix: password recovery clickable link and frontend logic`).
3. Ao rodar `git push origin main`, o Railway detecta o push e dispara builds para cada serviço configurado (`web` + o novo backend). A ordem é importante: **commit antes do push**.
4. Após o build, verifique no painel do Railway que:
   - O serviço web e o backend estão online.
   - As variáveis de ambiente foram populadas corretamente.
   - O frontend (`NEXT_PUBLIC_API_URL`) está apontando para a URL pública fornecida pelo backend.

## Testes Locais (antes do deploy)
- `npm run dev` na raiz roda `backend` + `web` via `concurrently`.
- Você também pode fazer builds isolados:
  - `cd web && npm install && npm run build`
  - `cd backend && npm install && npm run build`
- Use `npx prisma db push` (ou migrações) com `DATABASE_URL` apontando para o Postgres do Railway quando precisar sincronizar esquema.

## Observações extras
- Sempre mantenha o `railway.json` da raiz para o frontend; o backend usa o novo `backend/railway.json`.
- Ao adicionar serviços (Stripe webhooks, Resend etc.), confirme se os tokens são definidos nos dois ambientes (Railway + `.env` local).
