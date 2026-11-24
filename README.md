<p align="center">
  <img src=".github/assets/creatingj-mascot.png" alt="Mascote CreatingJ" width="220" />
</p>

<h1 align="center">CreatingJ Web</h1>

<p align="center">
  <strong>Não existe limite para sua imaginação.</strong>
</p>

<p align="center">
  Interface web da plataforma <strong>CreatingJ</strong> construída em <strong>Angular 21</strong> com TypeScript estrito, Signals e autenticação segura por cookie HttpOnly + CSRF.
</p>

---

## Sumário

- [Visão geral](#visão-geral)
- [Como rodar localmente](#como-rodar-localmente)
- [Segurança por padrão](#segurança-por-padrão)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes e build](#testes-e-build)
- [Autor](#autor)

---

## Visão geral

O **CreatingJ Web** conecta-se exclusivamente ao `creatingj-backend` (`/api/v1`), sem nenhuma chave de provedor de IA no navegador:

- Chat de IA com streaming SSE, cancelamento e renderização segura de código
- Projetos e base de conhecimento RAG (ingestão, jobs e busca semântica)
- Gestão de dispositivos pareados (`creatingj-runner`) e tarefas remotas com aprovações
- Quotas, histórico de consumo e painel administrativo de contas
- Autorização PKCE integrada para CLI, VS Code, Desktop e Mobile

---

## Como rodar localmente

### Pré-requisitos

- **Node.js** `22+` / **npm** `10+`
- **CreatingJ Backend** rodando em `http://127.0.0.1:8080` (`.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"`)

### Iniciar servidor de desenvolvimento

```bash
npm install
npm start
```

Acesse `http://localhost:4200`. O arquivo `proxy.conf.json` redireciona automaticamente `/api` para `http://127.0.0.1:8080`.

---

## Segurança por padrão

- **Zero segredos no bundle:** `environment.ts` contém apenas configuração pública (`/api/v1`).
- **Cookie HttpOnly + CSRF (`X-XSRF-TOKEN`):** nenhum access/refresh token é armazenado em `localStorage`.
- **Proteção XSS:** proibido `bypassSecurityTrustHtml` e `innerHTML` para conteúdo gerado pela IA.

---

## Estrutura do projeto

```text
creatingj-web/
├── public/assets/creatingj-mascot.png
├── proxy.conf.json
├── Jenkinsfile
└── src/app/
    ├── core/        # API v1, interceptors CSRF/ProblemDetail, auth, layout e tema
    ├── features/    # módulos lazy-loaded por domínio
    └── shared/ui/   # design system leve e acessível
```

---

## Testes e build

```bash
npx ng test --watch=false
npm run build
```

---

## Autor

Criado por **João Vitor Prestes Grando** ([@jvpgjava](https://github.com/jvpgjava)).
