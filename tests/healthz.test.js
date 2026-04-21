// Smoke test do endpoint /healthz — sobe o app.js (server.js) em uma porta
// livre, faz uma request real e valida o shape da resposta.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

function esperarServidor(url, timeoutMs = 5000) {
    const fim = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        (async function tentar() {
            try {
                const r = await fetch(url);
                if (r.ok) return resolve(r);
            } catch (_) { /* ainda subindo */ }
            if (Date.now() > fim) return reject(new Error('timeout esperando servidor'));
            setTimeout(tentar, 100);
        })();
    });
}

test('GET /healthz devolve status ok e contadores', async (t) => {
    const porta = 34567;
    const proc = spawn('node', ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(porta) },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    t.after(() => { try { proc.kill('SIGTERM'); } catch (_) {} });

    await esperarServidor(`http://127.0.0.1:${porta}/healthz`);
    const resp = await fetch(`http://127.0.0.1:${porta}/healthz`);
    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.status, 'ok');
    assert.ok(typeof body.uptime === 'number' && body.uptime >= 0);
    assert.ok(body.timestamp && !Number.isNaN(Date.parse(body.timestamp)));
    assert.ok(body.counts && typeof body.counts === 'object');
    for (const chave of ['usuarios', 'empresas', 'agendamentos', 'pagamentos', 'sessoesAtivas']) {
        assert.ok(Number.isInteger(body.counts[chave]), `${chave} deve ser inteiro`);
    }
});
