# Contribuindo com o Onde Tem?

Obrigado por considerar contribuir! Este é um projeto acadêmico de PWA em Node/Express — mantemos o stack simples de propósito.

## Como rodar localmente

```bash
git clone https://github.com/Aprendiz-Jr/ondetem.git
cd ondetem
npm install
npm start
# http://localhost:3000
```

## Antes de abrir uma PR

1. **Testes unitários** passam localmente:
   ```bash
   npm test
   ```
2. **Sem regressão visual** na home (`/`). Se o PR altera `index.html` / `style.css`, inclua screenshots **antes / depois**.
3. **Service Worker**: se mudar `index.html`, `style.css`, `script.js` ou `app.js`, bumpe `CACHE_NAME` / `RUNTIME_CACHE` em `service-worker.js` (ex.: `v14` → `v15`). Senão, clientes antigos continuam servindo o JS velho do cache.
4. **Nada de credenciais reais**: as senhas/tokens presentes no código são **seeds de teste** (`123456`, chave VAPID de exemplo). Não substitua por valores reais.

## Convenções

- **Branch**: `devin/<timestamp>-<slug>` (ex.: `devin/1776721998-fix-mapa`) ou `feat/...`, `fix/...`, `docs/...`.
- **Commit**: prefixos estilo Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- **Idioma**: código em PT-BR (identificadores e comentários), seguindo o estilo já presente em `server.js` e `script.js`.
- **Formatação**: 4 espaços de indentação em JS; não há linter configurado ainda.

## Áreas onde PRs são bem-vindas

Ver seção [Roadmap / sugestões para evolução](./README.md#roadmap--sugestões-para-evolução) no README. As melhores primeiras contribuições:

- Persistência real com SQLite (`better-sqlite3`).
- `bcrypt` + JWT no fluxo de login.
- `helmet` + `express-rate-limit` nas rotas públicas.
- Testes de integração da API usando `node --test`.
- Filtro por categoria também afetando os marcadores roxos no mapa.

## Código de conduta

Seja respeitoso. PRs têm mais chance de serem aceitas se acompanharem:
- Descrição do problema/motivação.
- Screenshot(s) quando altera UI.
- Evidência de que `npm test` continua passando.
