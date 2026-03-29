# 🚀 Release Notes - Aluga Fácil SaaS

Este arquivo documenta as subidas oficiais para o ambiente de produção na Railway.

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
