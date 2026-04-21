# Test Plan — Home estilo Airbnb (PR #15)

## Contexto
Redesign da home no estilo airbnb.com.br: topbar pill de busca, barra de categorias com underline ativo, grid de cards "produto-first" e mapa em seção própria com toggle. Sem mudanças em `script.js`, `server.js` ou nos modais — todos os hooks foram preservados.

Código relevante investigado:
- Filtro de categoria: `script.js:134-165` — listener em `.category-item` lê `querySelector('p').innerText` e filtra `document.querySelectorAll('.listings .row > div')` via `style.display`.
- Delegação do botão Agendar: `script.js:213-235` — `e.target.closest('.card-salao .card-body .btn')`.
- Gate de login: `script.js:224` → `exigirUsuarioLogado` → `abrirModalLoginNecessario` em `script.js:259-288`.
- Toggle do mapa (fix 362b7d0): `index.html:383-396` — chama `mapaInstancia.invalidateSize()` após reexibir.

## Estado inicial (pré-condições)
- Servidor local `http://localhost:3000/` acessível (já confirmado).
- Sessão do navegador SEM login (iniciaremos deslogado).
- Navegador maximizado.

## Primary flow (gravação única)

### T1 — Home renderiza no novo visual (Airbnb)
**Passos:** Abrir `http://localhost:3000/`.
**Asserções:**
- Topbar com `.ot-search-pill` visível e pelo menos 1 input com placeholder contendo "Serviço, salão ou profissional".
- Barra de categorias `.ot-categories-bar` com pelo menos 6 `.category-item` (ex.: "Cabelo", "Unhas", "Estética", "Massagem", "Spa", "Sobrancelhas").
- Grid `.listings` renderiza pelo menos 3 `.card-salao` **acima do mapa** (produto-first).
- `#mapaWrapper` presente, `.is-hidden` AUSENTE (mapa visível por padrão).
- Botão `#btnToggleMapa` com texto "Ocultar mapa".
**Falharia se quebrado:** redesign não aplicado → voltaria ao layout antigo com `.search-bar` fora de pill, cards dentro de `.service-card` sem `.ot-card` na imagem.

### T2 — Filtro por categoria oculta cards não-match
**Passos:** Clicar em `.category-item` cuja `p` contém "Unhas".
**Asserções (com 3 cards seed conhecidos):**
- "Estúdio Amora" (categorias: Cabelo, Unhas) — permanece visível.
- "Barbearia dos Santos" (categorias: Cabelo, Barba) — fica oculto (`display: none`).
- "Clínica Estética Flores" (categorias: Estética, Massagem) — fica oculto.
- `.category-item.active` contém a item clicada.
- Mensagem `#mensagem-resultados` exibe contagem compatível (ex: "1 resultado" ou "resultados para Unhas").
**Falharia se quebrado:** texto da categoria não vier de `p.innerText` → nenhum card filtrado, todos continuam visíveis.

### T3 — Agendar sem login dispara `#modalLoginNecessario`
**Passos:** Remover filtro (clicar em Unhas de novo) → clicar em qualquer botão "Agendar" dentro de um `.card-salao`.
**Asserções:**
- `#modalAgendamento` NÃO abre (ou não tem classe `show`).
- `#modalLoginNecessario` aparece com classe `show` e contém texto "Login necessário" (ou similar) + link para `login.html` com `redirect=` na URL.
- `mapaInstancia` continua definido (verificar via console: `typeof mapaInstancia === 'object'`).
**Falharia se quebrado:** hook `.card-salao .card-body .btn` quebrado pelo novo markup → Agendar sem efeito ou abre `#modalAgendamento` direto sem checar login.

### T4 — Login + Agendar abre `#modalAgendamento`
**Passos:** Fechar modal login necessário → clicar "Fazer login" → logar com `joao@email.com` / `123456` → voltar a `/` via redirect → clicar "Agendar" num card.
**Asserções:**
- Após login, URL volta para `http://localhost:3000/`.
- Clicar Agendar agora abre `#modalAgendamento` com classe `show`.
- Campo `#valorAgendamento` visível com valor default `60.00`.
- Select `#metodoPagamento` presente com opção "pix" selecionada.
- `#blocoPix` visível (ou já existe com `hidden` removido após selecionar pix — comportamento dinâmico de `sincronizarBlocoPagamento`).
**Falharia se quebrado:** agendamento não respeita login gate quebrado no caminho oposto.

### T5 — Toggle do mapa oculta e reexibe com tiles renderizados (fix mapaInstancia)
**Passos:** Fechar modal agendamento → rolar até seção do mapa → clicar `#btnToggleMapa`.
**Asserções após 1º clique (ocultar):**
- `#mapaWrapper` recebe classe `is-hidden`.
- Texto do botão muda para "Mostrar mapa".
- Computed `max-height` de `#mapaWrapper` = `0px` (ou opacidade 0).

**Passos:** Clicar `#btnToggleMapa` novamente (reexibir).
**Asserções após 2º clique:**
- Classe `is-hidden` removida.
- Texto do botão volta a "Ocultar mapa".
- Após ~200ms, `#map` tem tiles carregados corretamente (pelo menos 1 `.leaflet-tile-loaded` dentro de `#map` e pelo menos 1 `.leaflet-marker-icon` visível) — **sem faixas cinzas** que apareceriam se `invalidateSize()` não fosse chamado.
- Console não mostra erro `mapaInstancia is not defined`.
**Falharia se quebrado:** Se ainda estivesse em `window.leafletMap` (pré-fix), após reexibir o mapa ficaria com tiles incompletos/cinzas até o próximo resize do viewport.

## Escopo fora
- Pix "Já paguei" e cartão `4111...1111` — fluxo coberto em PRs #6/#9 e não mudou aqui.
- Cadastro de empresa, notificações, marcadores roxos — cobertos em #5/#9.
- Responsive mobile (bottom-nav) — regressão não-crítica; só inspecionar visualmente se sobrar tempo.

## Evidências
Gravação contínua cobrindo T1→T5 com annotations. Screenshot de T5 "antes/depois" do toggle com tiles.
