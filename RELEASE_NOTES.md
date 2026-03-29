# 🚀 Release Notes - Aluga Fácil SaaS

Este arquivo documenta as subidas oficiais para o ambiente de produção na Railway.

---

## [v1.1.2] - 2026-03-29
### 💳 Correção de Checkout em Produção e Diagnósticos 🛡️✨

Nesta versão, removemos dependências de IDs de teste no código e melhoramos as mensagens de erro do Stripe para facilitar a configuração em novos ambientes.

#### 🚀 O que há de novo?
*   **Remoção de Fallbacks de Teste**: O sistema agora exige que os IDs de preço sejam configurados via variáveis de ambiente, prevenindo erros de incompatibilidade entre Test/Live mode do Stripe. ✅🧬
*   **Logs de Erro Aprimorados**: Mensagens de erro mais detalhadas no console da Railway e para o usuário final em caso de falha na criação da sessão de checkout. 🏁🛡️

---

## [v1.1.1] - 2026-03-29
### 🛠️ Estabilização do Período de Teste e Redirecionamento 🛡️✨

Nesta versão de manutenção, corrigimos o fluxo de onboarding para garantir que novos usuários comecem corretamente no período de teste (Trial) e estabilizamos a visualização de faturamento.

#### 🚀 O que há de novo?
*   **Fix de Cadastro Trial**: Ajustada a lógica de criação de conta manual e via Google para atribuir o status `trial` por padrão, em vez do plano `básico`. ✅🧬
*   **Restauração da Régua de Trial**: Corrigido o bug onde a faixa azul de contagem regressiva sumia para novos usuários. 🏁🛡️
*   **Menu de Planos Persistente**: Garantida a visibilidade do menu "Planos" e do botão de upgrade, mesmo após retornos cancelados do Stripe. 💳✨

#### ⚙️ Requisitos de Produção (Atualização de Variáveis)
*   **`ENABLE_PLANS`**: `true` (Nova variável requerida no Railway) ✅
*   **`FRONTEND_URL`**: Deve permanecer `https://www.alugafacil.net.br` em produção. 🌐

---

## [v1.1.0] - 2026-03-29
### 🏁 Sincronização de Produção e Novo Domínio Oficial ✨🏙️

Nesta versão, concluímos a migração completa da plataforma para o domínio definitivo e sincronizamos a lógica de planos comerciais entre os ambientes de desenvolvimento e produção.

#### 🚀 O que há de novo?
*   **Novo Domínio Oficial**: A plataforma agora opera sob o domínio **`https://www.alugafacil.net.br`**. 🌐✅
*   **Rebranding de Planos**: Terminação do modelo técnico "trial/pro" para o modelo comercial **`Básico`** e **`Completo`**. 🧬💎
*   **Banner de Boas-Vindas**: O contador de dias restantes do período de teste agora está 100% funcional no novo domínio. 🏁🛡️
*   **Modo Sentinela (Risco Zero)**: Implementado sistema de manutenção centralizado que pode ser ativado via variável de ambiente. 🔒✨

#### 🛠️ Melhorias Técnicas
*   **Migração de Banco de Dados**: Script executado para converter todos os usuários existentes para a nova nomenclatura de planos (`basico`/`completo`). ⚙️🌐
*   **Sincronização de SEO**: Metatags e OpenGraph atualizados para otimização no Google e redes sociais sob o novo domínio. 📈🚀
*   **Emails Dinâmicos**: O sistema de envio de e-mails (Resend) agora utiliza URLs dinâmicas baseadas nas variáveis de produção. 📧✨

#### 🛡️ Segurança e Estabilização
*   **Blindagem de CORS**: Backend reconfigurado para aceitar origens seguras dinâmicas do domínio `.net.br`. 🛡️⚙️
*   **Google OAuth**: Sincronização de protocolos de autenticação para o novo domínio de produção. 🔑✅

#### ⚙️ Variáveis de Ambiente (Railway Requeridas)
*   `FRONTEND_URL`: `https://www.alugafacil.net.br`
*   `MAINTENANCE_MODE`: `false` (ou `true` para travar o site)
*   `NEXT_PUBLIC_ENABLE_TRIAL_ENFORCEMENT`: `true`

---

> _"O Aluga Fácil agora é oficialmente um SaaS de alta performance e pronto para escalar."_ 🥂✨ 🚀🏁
