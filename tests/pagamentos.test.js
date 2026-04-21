// Testes unitários executados com `node --test` (nativo do Node >= 18).
// Foco nas regras de simulação de pagamento expostas em server.js.
// Como server.js não exporta as funções, as reimplementamos aqui com a
// mesma especificação — qualquer mudança de comportamento no servidor
// deve ser refletida aqui e vice-versa.

const test = require('node:test');
const assert = require('node:assert/strict');

function cartaoPassaLuhn(numero) {
    const digitos = String(numero || '').replace(/\D/g, '');
    if (digitos.length < 13 || digitos.length > 19) return false;
    let soma = 0;
    let alt = false;
    for (let i = digitos.length - 1; i >= 0; i--) {
        let n = parseInt(digitos[i], 10);
        if (alt) { n *= 2; if (n > 9) n -= 9; }
        soma += n;
        alt = !alt;
    }
    return soma % 10 === 0;
}

function validadeFutura(validade, agora = new Date()) {
    const s = String(validade || '').replace(/\s/g, '');
    const m = s.match(/^(\d{2})\s*\/?\s*(\d{2}|\d{4})$/);
    if (!m) return false;
    const mes = parseInt(m[1], 10);
    let ano = parseInt(m[2], 10);
    if (mes < 1 || mes > 12) return false;
    if (m[2].length === 2) ano += 2000;
    const fimDoMes = new Date(ano, mes, 0, 23, 59, 59);
    return fimDoMes.getTime() >= agora.getTime();
}

function bandeiraPeloPrefixo(numero) {
    const d = String(numero || '').replace(/\D/g, '');
    if (/^4/.test(d)) return 'visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
    if (/^3[47]/.test(d)) return 'amex';
    if (/^(6011|65|64[4-9]|622)/.test(d)) return 'discover';
    if (/^(606282|3841)/.test(d)) return 'hipercard';
    if (/^(50|5[6-8]|6[0-9])/.test(d)) return 'elo';
    return 'desconhecida';
}

test('cartaoPassaLuhn: aprova números válidos conhecidos', () => {
    assert.equal(cartaoPassaLuhn('4111 1111 1111 1111'), true);
    assert.equal(cartaoPassaLuhn('5555555555554444'), true);
    assert.equal(cartaoPassaLuhn('4242 4242 4242 0000'), true);
});

test('cartaoPassaLuhn: reprova números inválidos ou fora do tamanho', () => {
    assert.equal(cartaoPassaLuhn('1234 5678 9012 3456'), false);
    assert.equal(cartaoPassaLuhn('4111 1111 1111 1112'), false);
    assert.equal(cartaoPassaLuhn(''), false);
    assert.equal(cartaoPassaLuhn('123'), false);
    assert.equal(cartaoPassaLuhn('1'.repeat(20)), false);
});

test('validadeFutura: aceita datas no futuro em MM/AA e MM/AAAA', () => {
    const hoje = new Date('2026-04-20T12:00:00Z');
    assert.equal(validadeFutura('12/29', hoje), true);
    assert.equal(validadeFutura('12/2029', hoje), true);
    assert.equal(validadeFutura('04/26', hoje), true); // fim do mês corrente
});

test('validadeFutura: rejeita datas passadas e formatos inválidos', () => {
    const hoje = new Date('2026-04-20T12:00:00Z');
    assert.equal(validadeFutura('01/20', hoje), false);
    assert.equal(validadeFutura('13/29', hoje), false);
    assert.equal(validadeFutura('00/29', hoje), false);
    assert.equal(validadeFutura('abc', hoje), false);
    assert.equal(validadeFutura('', hoje), false);
});

test('bandeiraPeloPrefixo: detecta as principais bandeiras', () => {
    assert.equal(bandeiraPeloPrefixo('4111 1111 1111 1111'), 'visa');
    assert.equal(bandeiraPeloPrefixo('5555 5555 5555 4444'), 'mastercard');
    assert.equal(bandeiraPeloPrefixo('3782 822463 10005'), 'amex');
    assert.equal(bandeiraPeloPrefixo('0000 0000 0000 0000'), 'desconhecida');
});

test('regra de simulação: cartão terminando em 0000 é recusado', () => {
    const aprovado = '4111 1111 1111 1111';
    const recusado = '4242 4242 4242 0000';
    assert.equal(cartaoPassaLuhn(aprovado), true);
    assert.equal(cartaoPassaLuhn(recusado), true);
    const fimRecusa = s => String(s).replace(/\D/g, '').endsWith('0000');
    assert.equal(fimRecusa(aprovado), false);
    assert.equal(fimRecusa(recusado), true);
});
