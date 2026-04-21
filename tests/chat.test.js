// tests/chat.test.js — testes unitários para o módulo de chat IA.
// Não chamam a API real do Gemini; cobrem apenas normalização, formatação e
// rate-limit, que são a lógica pura em ./chat.js.

const test = require('node:test');
const assert = require('node:assert/strict');

const chat = require('../chat.js');

test('normalizarHistorico aceita apenas roles válidos', () => {
    const entrada = [
        { role: 'user', content: 'oi' },
        { role: 'system', content: 'hack' }, // deve ser removido
        { role: 'assistant', content: 'olá' },
        { role: 'user', content: '   ' },    // vazio após trim: removido
        { role: 'user', content: 'como agendo?' },
    ];
    const saida = chat.normalizarHistorico(entrada);
    assert.deepEqual(saida.map(m => m.role), ['user', 'assistant', 'user']);
    assert.equal(saida[0].content, 'oi');
    assert.equal(saida[2].content, 'como agendo?');
});

test('normalizarHistorico devolve null quando não há mensagens válidas', () => {
    assert.equal(chat.normalizarHistorico(null), null);
    assert.equal(chat.normalizarHistorico([]), null);
    assert.equal(chat.normalizarHistorico([{ role: 'system', content: 'x' }]), null);
});

test('normalizarHistorico trunca mensagens gigantes em 2000 caracteres', () => {
    const grande = 'a'.repeat(5000);
    const saida = chat.normalizarHistorico([{ role: 'user', content: grande }]);
    assert.equal(saida[0].content.length, 2000);
});

test('normalizarHistorico limita a 20 mensagens (as mais recentes)', () => {
    const mensagens = Array.from({ length: 30 }, (_, i) => ({
        role: 'user',
        content: `msg${i}`,
    }));
    const saida = chat.normalizarHistorico(mensagens);
    assert.equal(saida.length, 20);
    assert.equal(saida[0].content, 'msg10'); // descartou as 10 primeiras
    assert.equal(saida[saida.length - 1].content, 'msg29');
});

test('paraFormatoGemini converte "assistant" -> "model"', () => {
    const resultado = chat.paraFormatoGemini([
        { role: 'user', content: 'oi' },
        { role: 'assistant', content: 'olá' },
    ]);
    assert.equal(resultado[0].role, 'user');
    assert.equal(resultado[1].role, 'model');
    assert.equal(resultado[0].parts[0].text, 'oi');
});

test('passaRateLimit bloqueia após 20 mensagens na mesma janela', () => {
    chat._resetRateLimit();
    const ip = '203.0.113.7';
    for (let i = 0; i < 20; i++) {
        assert.equal(chat.passaRateLimit(ip), true, `msg ${i + 1} deveria passar`);
    }
    assert.equal(chat.passaRateLimit(ip), false, '21ª mensagem deve ser bloqueada');
});

test('passaRateLimit é isolado por IP', () => {
    chat._resetRateLimit();
    for (let i = 0; i < 20; i++) chat.passaRateLimit('1.1.1.1');
    assert.equal(chat.passaRateLimit('1.1.1.1'), false);
    assert.equal(chat.passaRateLimit('2.2.2.2'), true, 'IP novo não pode herdar limite');
});

test('SYSTEM_PROMPT menciona o nome do app e regras de pagamento', () => {
    assert.match(chat.SYSTEM_PROMPT, /Onde Tem\?/);
    assert.match(chat.SYSTEM_PROMPT, /Pix/);
    assert.match(chat.SYSTEM_PROMPT, /cart[ãa]o/i);
});
