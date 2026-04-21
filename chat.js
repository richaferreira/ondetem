// chat.js — integração com Google Gemini para o chat IA do Onde Tem?
//
// Usa a API REST do Google AI Studio (gemini-1.5-flash) por padrão. A chave é
// lida de process.env.GEMINI_API_KEY. Se a chave não estiver definida, o
// endpoint responde 503 com mensagem amigável em vez de 500, assim a UI do
// widget consegue mostrar um aviso útil sem poluir o console.

'use strict';

const MODELO_PADRAO = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Contexto do produto — fica no servidor para o cliente não conseguir
// reescrever o "sistema" do modelo via mensagem.
const SYSTEM_PROMPT = [
    'Você é a assistente virtual do "Onde Tem?", um app de agendamento de serviços de beleza (salões, barbearias, clínicas de estética).',
    '',
    'Responda em português do Brasil, de forma curta (1 a 3 frases quando possível), amigável e objetiva. Use emojis com moderação.',
    '',
    'O que o app faz:',
    '- Cliente escolhe um salão no mapa ou na lista, clica em "Agendar", escolhe serviço/data/hora e paga (Pix ou cartão de crédito).',
    '- Empresa cadastra perfil + localização no mapa (obrigatório) + serviços, e recebe agendamentos no painel.',
    '- Admin acompanha o painel administrativo.',
    '',
    'Categorias disponíveis: Cabelo, Unhas, Depilação, Sobrancelhas, Massagem, Rosto.',
    '',
    'Regras de pagamento:',
    '- Pix: gera QR Code e "copia e cola"; o próprio usuário confirma (simulação).',
    '- Cartão de crédito: valida Luhn + validade MM/AA + CVV; cartões terminados em 0000 são recusados na simulação (fundos insuficientes).',
    '',
    'Para agendar é necessário estar logado. Sem login, o app abre um modal "Login necessário" ao clicar em Agendar.',
    '',
    'Tipos de conta: usuário (cliente), empresa (salão) e admin.',
    '',
    'Se a pergunta for fora do escopo do Onde Tem? (ex.: receitas de bolo, programação, opinião política), diga educadamente que só consegue ajudar com dúvidas sobre agendamentos, pagamentos e uso do app.',
    '',
    'Nunca invente preços específicos de salões nem horários — oriente o usuário a abrir o card do salão.',
].join('\n');

const LIMITE_MENSAGENS = 20; // protege contra payload gigante
const LIMITE_TAMANHO = 2000; // caracteres por mensagem

function normalizarHistorico(mensagens) {
    if (!Array.isArray(mensagens)) return null;
    const filtradas = mensagens
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content.trim().slice(0, LIMITE_TAMANHO) }))
        .filter(m => m.content.length > 0);
    if (filtradas.length === 0) return null;
    return filtradas.slice(-LIMITE_MENSAGENS);
}

// Gemini espera `contents: [{role: 'user'|'model', parts: [{text}]}]`.
function paraFormatoGemini(historico) {
    return historico.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));
}

async function chamarGemini(historico, apiKey) {
    const url = `${BASE_URL}/${MODELO_PADRAO}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const corpo = {
        systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
        contents: paraFormatoGemini(historico),
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    };
    const controle = new AbortController();
    const timeout = setTimeout(() => controle.abort(), 20000);
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo),
            signal: controle.signal,
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            const err = new Error(`Gemini HTTP ${resp.status}`);
            err.status = resp.status;
            err.detalhe = txt.slice(0, 500);
            throw err;
        }
        const data = await resp.json();
        const candidato = data.candidates && data.candidates[0];
        const texto = candidato && candidato.content && candidato.content.parts
            ? candidato.content.parts.map(p => p.text || '').join('').trim()
            : '';
        return { texto, finishReason: candidato && candidato.finishReason };
    } finally {
        clearTimeout(timeout);
    }
}

// Rate limit simples em memória: janela deslizante por IP.
const JANELA_MS = 60 * 1000;
const LIMITE_POR_IP = 20;
const registros = new Map();

function passaRateLimit(ip) {
    const agora = Date.now();
    const lista = (registros.get(ip) || []).filter(ts => agora - ts < JANELA_MS);
    if (lista.length >= LIMITE_POR_IP) {
        registros.set(ip, lista);
        return false;
    }
    lista.push(agora);
    registros.set(ip, lista);
    return true;
}

function registrarRotas(app) {
    app.post('/api/chat', async (req, res) => {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon').split(',')[0].trim();
        if (!passaRateLimit(ip)) {
            return res.status(429).json({ erro: 'Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente de novo.' });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                erro: 'Chat IA indisponível no momento: administrador não configurou a chave do Gemini.',
            });
        }
        const historico = normalizarHistorico(req.body && req.body.mensagens);
        if (!historico) {
            return res.status(400).json({ erro: 'Envie { mensagens: [{role, content}] } com pelo menos 1 mensagem do usuário.' });
        }
        try {
            const { texto, finishReason } = await chamarGemini(historico, apiKey);
            if (!texto) {
                return res.status(502).json({
                    erro: 'A IA não retornou resposta. Tente reformular a pergunta.',
                    finishReason: finishReason || null,
                });
            }
            return res.json({ resposta: texto, finishReason: finishReason || 'STOP' });
        } catch (e) {
            const status = e && e.status ? (e.status >= 500 ? 502 : e.status) : 502;
            return res.status(status).json({
                erro: 'Falha ao consultar o serviço de IA. Tente novamente em instantes.',
            });
        }
    });
}

module.exports = {
    registrarRotas,
    // exportados para testes unitários
    normalizarHistorico,
    paraFormatoGemini,
    passaRateLimit,
    _resetRateLimit: () => registros.clear(),
    SYSTEM_PROMPT,
};
