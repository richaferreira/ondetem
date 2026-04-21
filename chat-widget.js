/**
 * chat-widget.js — widget flutuante de chat IA do Onde Tem?
 *
 * Injeta uma bolha no canto inferior direito em qualquer página que carregue
 * este script. Ao abrir, mostra um painel com histórico e textarea. As
 * mensagens são enviadas para POST /api/chat e o servidor proxy repassa ao
 * Google Gemini. Nenhuma chave de API é exposta no client.
 *
 * Histórico fica em sessionStorage ('ondetem_chat_historico') para persistir
 * durante a navegação mas sumir quando o usuário fechar o navegador.
 */
(function () {
    'use strict';
    if (window.__ondetem_chat_widget) return;
    window.__ondetem_chat_widget = true;

    const KEY_HISTORICO = 'ondetem_chat_historico';
    const LIMITE_HISTORICO = 30;

    const MENSAGEM_BOAS_VINDAS = 'Oi! Sou a assistente do Onde Tem?. Posso ajudar com dúvidas sobre agendamentos, pagamento, cadastro de salão e o que mais você precisar do app.';

    function carregarHistorico() {
        try {
            const raw = sessionStorage.getItem(KEY_HISTORICO);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'));
        } catch { return []; }
    }

    function salvarHistorico(historico) {
        try {
            sessionStorage.setItem(KEY_HISTORICO, JSON.stringify(historico.slice(-LIMITE_HISTORICO)));
        } catch { /* quota ou modo privado: ignora */ }
    }

    function escapar(texto) {
        return String(texto)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
    }

    // Converte markdown mínimo (negrito, itálico, quebras de linha) em HTML seguro.
    function formatarTexto(texto) {
        const esc = escapar(texto);
        return esc
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
            .replace(/\n/g, '<br>');
    }

    function criarElemento(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        return tpl.content.firstElementChild;
    }

    function montarDOM() {
        const raiz = criarElemento(`
            <div class="ot-chat-root" aria-live="polite">
                <button type="button" class="ot-chat-bubble" aria-label="Abrir chat de ajuda" title="Dúvidas? Fale com a assistente">
                    <i class="bi bi-chat-dots-fill"></i>
                </button>

                <section class="ot-chat-panel" role="dialog" aria-label="Chat de ajuda" hidden>
                    <header class="ot-chat-header">
                        <div class="ot-chat-title">
                            <span class="ot-chat-avatar"><i class="bi bi-robot"></i></span>
                            <div>
                                <strong>Assistente Onde Tem?</strong>
                                <small>Respostas em segundos · IA</small>
                            </div>
                        </div>
                        <button type="button" class="ot-chat-close" aria-label="Fechar chat">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </header>

                    <div class="ot-chat-body"></div>

                    <form class="ot-chat-form" novalidate>
                        <textarea class="ot-chat-input" rows="1" maxlength="2000"
                            placeholder="Pergunte sobre agendamentos, pagamento…" required></textarea>
                        <button type="submit" class="ot-chat-send" aria-label="Enviar">
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </form>
                </section>
            </div>
        `);
        document.body.appendChild(raiz);
        return raiz;
    }

    function renderizarMensagem(corpo, { role, content }, { digitando } = {}) {
        const bolha = document.createElement('div');
        bolha.className = 'ot-chat-msg ot-chat-msg-' + (role === 'user' ? 'user' : 'bot');
        if (digitando) {
            bolha.classList.add('ot-chat-msg-typing');
            bolha.innerHTML = '<span class="ot-chat-dot"></span><span class="ot-chat-dot"></span><span class="ot-chat-dot"></span>';
        } else {
            bolha.innerHTML = role === 'user' ? escapar(content).replace(/\n/g, '<br>') : formatarTexto(content);
        }
        corpo.appendChild(bolha);
        corpo.scrollTop = corpo.scrollHeight;
        return bolha;
    }

    function renderizarTudo(corpo, historico) {
        corpo.innerHTML = '';
        if (historico.length === 0) {
            renderizarMensagem(corpo, { role: 'assistant', content: MENSAGEM_BOAS_VINDAS });
        } else {
            historico.forEach(m => renderizarMensagem(corpo, m));
        }
    }

    async function enviarMensagem(historicoParaEnviar) {
        const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagens: historicoParaEnviar }),
        });
        let data = null;
        try { data = await resp.json(); } catch { /* ignore */ }
        if (!resp.ok) {
            const msg = (data && data.erro) || `Erro ${resp.status} ao falar com a IA.`;
            throw new Error(msg);
        }
        if (!data || !data.resposta) {
            throw new Error('Resposta vazia da IA. Tente de novo.');
        }
        return data.resposta;
    }

    function init() {
        const raiz = montarDOM();
        const bubble = raiz.querySelector('.ot-chat-bubble');
        const painel = raiz.querySelector('.ot-chat-panel');
        const corpo = raiz.querySelector('.ot-chat-body');
        const fechar = raiz.querySelector('.ot-chat-close');
        const form = raiz.querySelector('.ot-chat-form');
        const input = raiz.querySelector('.ot-chat-input');

        const historico = carregarHistorico();
        renderizarTudo(corpo, historico);

        function abrir() {
            painel.hidden = false;
            raiz.classList.add('ot-chat-open');
            setTimeout(() => input.focus(), 50);
        }
        function fecharPainel() {
            painel.hidden = true;
            raiz.classList.remove('ot-chat-open');
        }

        bubble.addEventListener('click', () => {
            if (painel.hidden) abrir(); else fecharPainel();
        });
        fechar.addEventListener('click', fecharPainel);

        // Enviar no Enter (Shift+Enter quebra linha).
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.requestSubmit();
            }
        });
        // Auto-resize do textarea.
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 140) + 'px';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const texto = (input.value || '').trim();
            if (!texto) return;
            const enviar = form.querySelector('.ot-chat-send');
            enviar.disabled = true;
            input.disabled = true;

            const msgUser = { role: 'user', content: texto };
            historico.push(msgUser);
            renderizarMensagem(corpo, msgUser);
            input.value = '';
            input.style.height = 'auto';

            const digitando = renderizarMensagem(corpo, { role: 'assistant', content: '' }, { digitando: true });
            try {
                const resposta = await enviarMensagem(historico);
                digitando.remove();
                const msgBot = { role: 'assistant', content: resposta };
                historico.push(msgBot);
                renderizarMensagem(corpo, msgBot);
                salvarHistorico(historico);
            } catch (erro) {
                digitando.remove();
                renderizarMensagem(corpo, {
                    role: 'assistant',
                    content: '⚠️ ' + (erro && erro.message ? erro.message : 'Não consegui responder agora.'),
                });
            } finally {
                enviar.disabled = false;
                input.disabled = false;
                input.focus();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
