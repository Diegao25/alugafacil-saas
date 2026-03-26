# Load Tests

Scripts de carga usando [k6](https://k6.io/).

## Instalação do k6

- macOS: `brew install k6`
- Windows: `choco install k6`
- Linux: Ver https://k6.io/docs/getting-started/installation/

## Execução

```bash
# Smoke test rápido
k6 run load-tests/api-load.js

# Com usuário de teste configurado
TEST_EMAIL=user@example.com TEST_PASSWORD=Senha123 k6 run load-tests/api-load.js

# Contra ambiente de staging
BASE_URL=https://api.exemplo.com k6 run load-tests/api-load.js

# Com relatório HTML
k6 run --out json=results.json load-tests/api-load.js
```

## Cenários

| Cenário | VUs | Duração | Objetivo |
|---------|-----|---------|----------|
| auth_smoke | 1 | 10s | Verificação básica de saúde |
| auth_load | 0→10 | 1m | Carga crescente nos endpoints de auth |
| api_concurrent | 20 | 1m | Uso concorrente da API protegida |

## Thresholds de Qualidade

- `p(95) < 500ms` - 95% das requisições abaixo de 500ms
- `p(99) < 1000ms` - 99% das requisições abaixo de 1s
- `error rate < 5%` - Taxa de erros abaixo de 5%
- `auth success > 95%` - Login bem-sucedido em > 95% das tentativas
