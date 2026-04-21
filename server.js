// server.js — Onde Tem? (v1.1)
// Servidor Express com rotas de páginas + API + autenticação por token simples.

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Healthcheck simples (útil para monitoramento / deploy / CI).
app.get('/healthz', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        counts: {
            usuarios: db.usuarios.length,
            empresas: db.empresas.length,
            agendamentos: db.agendamentos.length,
            pagamentos: db.pagamentos.length,
            sessoesAtivas: db.sessoes.size
        }
    });
});

// ==========================================
// "Banco de dados" em memória (substituir por DB real depois)
// ==========================================
const db = {
    usuarios: [
        { id: 1, nome: 'João Silva', email: 'joao@email.com', senha: '123456', tipo: 'usuario' }
    ],
    empresas: [
        {
            id: 1,
            nome: 'Salão Beleza Pura',
            cnpj: '12.345.678/0001-99',
            razaoSocial: 'Beleza Pura LTDA',
            email: 'empresa@ondetem.com',
            senha: '123456',
            telefone: '(11) 99999-0000',
            endereco: 'Rua das Flores, 123 - Centro',
            lat: -22.9340,
            lng: -42.5010,
            categorias: ['Cabelo', 'Unhas'],
            horario: 'Seg a Sex 09h-19h | Sáb 09h-15h',
            status: 'ativo',
            tipo: 'empresa'
        }
    ],
    admin: { email: 'admin@ondetem.com', senha: '123456' },
    agendamentos: [],   // { id, usuarioEmail, empresaId, servicoId, estabelecimento, data, hora, pagamento, status }
    servicos: [         // produtos/serviços por empresa
        { id: 1, empresaId: 1, nome: 'Corte de cabelo feminino', preco: 60, duracao: 45 },
        { id: 2, empresaId: 1, nome: 'Manicure', preco: 35, duracao: 40 }
    ],
    pagamentos: [],     // { id, usuarioEmail, metodo, valor, status, ... }
    sessoes: new Map() // token -> { email, tipo, id }
};

function gerarToken() {
    return crypto.randomBytes(24).toString('hex');
}

// ==========================================
// Middleware de autenticação
// ==========================================
function autenticar(req, res, next) {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const sessao = token ? db.sessoes.get(token) : null;
    if (!sessao) {
        return res.status(401).json({ erro: 'Não autenticado. Faça login.' });
    }
    req.usuario = sessao;
    next();
}

function exigirTipo(...tipos) {
    return (req, res, next) => {
        if (!tipos.includes(req.usuario?.tipo)) {
            return res.status(403).json({ erro: 'Acesso negado para este tipo de usuário.' });
        }
        next();
    };
}

// ==========================================
// 1. ROTAS DE PÁGINAS
// ==========================================
const paginas = ['/', '/login', '/agendamentos', '/cadastro-usuario', '/cadastro-empresa', '/admin', '/painel-empresa'];
const arquivos = {
    '/': 'index.html',
    '/login': 'login.html',
    '/agendamentos': 'agendamentos.html',
    '/cadastro-usuario': 'cadastro-usuario.html',
    '/cadastro-empresa': 'cadastro-empresa.html',
    '/admin': 'admin.html',
    '/painel-empresa': 'painel-empresa.html'
};
paginas.forEach(rota => {
    app.get(rota, (req, res) => res.sendFile(path.join(__dirname, arquivos[rota])));
});

// ==========================================
// 2. API — LOGIN / LOGOUT / SESSÃO
// ==========================================
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Preencha o e-mail e a senha.' });

    let usuario = null;

    if (tipo === 'admin') {
        if (email === db.admin.email && senha === db.admin.senha) {
            usuario = { id: 0, email, tipo: 'admin', nome: 'Administrador' };
        }
    } else if (tipo === 'empresa') {
        const e = db.empresas.find(x => x.email === email && x.senha === senha);
        if (e) usuario = { id: e.id, email: e.email, tipo: 'empresa', nome: e.nome };
    } else if (tipo === 'usuario') {
        const u = db.usuarios.find(x => x.email === email && x.senha === senha);
        if (u) usuario = { id: u.id, email: u.email, tipo: 'usuario', nome: u.nome };
    }

    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const token = gerarToken();
    db.sessoes.set(token, usuario);
    res.json({ mensagem: 'Autenticação aprovada', token, usuario });
});

app.post('/api/logout', autenticar, (req, res) => {
    const token = req.headers['authorization'].slice(7);
    db.sessoes.delete(token);
    res.json({ mensagem: 'Logout efetuado' });
});

app.get('/api/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

// ==========================================
// 3. API — AGENDAMENTOS (somente logados)
// ==========================================

// Usuário lista os próprios agendamentos / Empresa lista os recebidos / Admin lista todos
app.get('/api/agendamentos', autenticar, (req, res) => {
    let lista = db.agendamentos;
    if (req.usuario.tipo === 'usuario') {
        lista = lista.filter(a => a.usuarioEmail === req.usuario.email);
    } else if (req.usuario.tipo === 'empresa') {
        lista = lista.filter(a => a.empresaId === req.usuario.id);
    }
    res.json({ status: 'sucesso', dados: lista });
});

// Apenas usuários logados podem agendar
app.post('/api/agendamentos', autenticar, exigirTipo('usuario'), (req, res) => {
    const { empresaId, servicoId, estabelecimento, data, hora, pagamento, pagamentoId } = req.body;
    if (!data || !hora || (!estabelecimento && !empresaId)) {
        return res.status(400).json({ erro: 'Dados incompletos para o agendamento.' });
    }
    const novo = {
        id: Date.now(),
        usuarioEmail: req.usuario.email,
        usuarioNome: req.usuario.nome,
        empresaId: empresaId || null,
        servicoId: servicoId || null,
        estabelecimento: estabelecimento || (db.empresas.find(e => e.id === empresaId)?.nome ?? ''),
        data, hora,
        pagamento: pagamento || 'A combinar',
        pagamentoId: pagamentoId || null,
        status: 'pendente',
        criadoEm: new Date().toISOString()
    };
    db.agendamentos.push(novo);
    res.status(201).json({ mensagem: 'Agendamento criado com sucesso!', dados: novo });
});

// Empresa atualiza status (aceitar/recusar/concluir)
app.patch('/api/agendamentos/:id', autenticar, exigirTipo('empresa', 'admin'), (req, res) => {
    const { status } = req.body;
    const ag = db.agendamentos.find(a => a.id === Number(req.params.id));
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    if (req.usuario.tipo === 'empresa' && ag.empresaId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Este agendamento não é da sua empresa.' });
    }
    if (!['pendente', 'confirmado', 'recusado', 'concluido'].includes(status)) {
        return res.status(400).json({ erro: 'Status inválido' });
    }
    ag.status = status;
    res.json({ mensagem: 'Status atualizado', dados: ag });
});

// ==========================================
// 3b. API — PAGAMENTOS (simulação: cartão de crédito e Pix)
// ==========================================
//
// ATENÇÃO: este endpoint é uma SIMULAÇÃO. Não integra com gateway real
// (Stripe, Pagar.me, Mercado Pago etc.) e não deve ser usado em produção
// com dados reais de cartão. Serve para permitir que o fluxo de agendamento
// seja testado de ponta a ponta com feedback realista (aprovado / recusado /
// aguardando) antes de uma integração real.
//
// Contas / números de teste:
//  - Cartão que APROVA:   qualquer número que passe no Luhn e NÃO termine em "0000"
//                         (ex.: 4111 1111 1111 1111)
//  - Cartão que RECUSA:   passa no Luhn mas termina em "0000"
//                         (ex.: 4242 4242 4242 0000) -> simula "fundos insuficientes"
//  - Pix:                 cria cobrança com status "aguardando" e devolve um
//                         "copia e cola" aleatório. Para simular a confirmação
//                         do pagamento, chame POST /api/pagamentos/pix/:id/confirmar.

// Valida número de cartão de crédito pelo algoritmo de Luhn.
function cartaoPassaLuhn(numero) {
    const digitos = String(numero || '').replace(/\D/g, '');
    if (digitos.length < 13 || digitos.length > 19) return false;
    let soma = 0;
    let alt = false;
    for (let i = digitos.length - 1; i >= 0; i--) {
        let n = parseInt(digitos[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        soma += n;
        alt = !alt;
    }
    return soma % 10 === 0;
}

// Verifica se MM/AA (ou MM/AAAA) está no futuro. Aceita também "MMAA".
function validadeFutura(validade) {
    const s = String(validade || '').replace(/\s/g, '');
    const m = s.match(/^(\d{2})\s*\/?\s*(\d{2}|\d{4})$/);
    if (!m) return false;
    const mes = parseInt(m[1], 10);
    let ano = parseInt(m[2], 10);
    if (mes < 1 || mes > 12) return false;
    if (m[2].length === 2) ano += 2000;
    const agora = new Date();
    const fimDoMes = new Date(ano, mes, 0, 23, 59, 59);
    return fimDoMes.getTime() >= agora.getTime();
}

function mascararCartao(numero) {
    const digitos = String(numero || '').replace(/\D/g, '');
    const ult4 = digitos.slice(-4);
    return `**** **** **** ${ult4}`;
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

function limparPagamentoParaResposta(p) {
    const { _cartaoBruto, _cvv, ...publico } = p;
    return publico;
}

// Lista pagamentos. Usuário só vê os próprios. Admin vê todos. Empresa só vê
// os pagamentos associados a agendamentos dela (via pagamentoId no agendamento),
// o que evita expor pagamentos de clientes de outras empresas.
function pagamentosVisiveisPara(usuario) {
    if (usuario.tipo === 'admin') return db.pagamentos.slice();
    if (usuario.tipo === 'usuario') {
        return db.pagamentos.filter(p => p.usuarioEmail === usuario.email);
    }
    if (usuario.tipo === 'empresa') {
        const idsDaEmpresa = new Set(
            db.agendamentos
                .filter(a => a.empresaId === usuario.id && a.pagamentoId)
                .map(a => a.pagamentoId)
        );
        return db.pagamentos.filter(p => idsDaEmpresa.has(p.id));
    }
    return [];
}

app.get('/api/pagamentos', autenticar, (req, res) => {
    const saida = pagamentosVisiveisPara(req.usuario).map(limparPagamentoParaResposta);
    res.json({ status: 'sucesso', dados: saida });
});

app.get('/api/pagamentos/:id', autenticar, (req, res) => {
    const p = db.pagamentos.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
    const permitido = pagamentosVisiveisPara(req.usuario).some(x => x.id === p.id);
    if (!permitido) {
        return res.status(403).json({ erro: 'Este pagamento não pertence a você.' });
    }
    res.json({ status: 'sucesso', dados: limparPagamentoParaResposta(p) });
});

// Simula cobrança no cartão de crédito.
// Body: { valor, numero, nome, validade, cvv, parcelas?, agendamentoId? }
app.post('/api/pagamentos/cartao', autenticar, (req, res) => {
    const { valor, numero, nome, validade, cvv, parcelas, agendamentoId } = req.body || {};

    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
        return res.status(400).json({ erro: 'Informe um valor maior que zero.' });
    }
    if (!numero || !nome || !validade || !cvv) {
        return res.status(400).json({ erro: 'Preencha número do cartão, nome, validade e CVV.' });
    }
    const digitos = String(numero).replace(/\D/g, '');
    if (!cartaoPassaLuhn(digitos)) {
        return res.status(400).json({ erro: 'Número de cartão inválido.' });
    }
    if (!validadeFutura(validade)) {
        return res.status(400).json({ erro: 'Validade do cartão expirada ou em formato inválido (use MM/AA).' });
    }
    const cvvDigitos = String(cvv).replace(/\D/g, '');
    if (cvvDigitos.length < 3 || cvvDigitos.length > 4) {
        return res.status(400).json({ erro: 'CVV inválido.' });
    }
    const parcelasNum = Math.max(1, Math.min(12, parseInt(parcelas, 10) || 1));

    // Regra de simulação: cartão terminando em 0000 é recusado.
    const recusado = digitos.endsWith('0000');

    const pagamento = {
        id: `pag_${crypto.randomBytes(8).toString('hex')}`,
        usuarioEmail: req.usuario.email,
        metodo: 'cartao',
        valor: Math.round(valorNum * 100) / 100,
        parcelas: parcelasNum,
        bandeira: bandeiraPeloPrefixo(digitos),
        cartaoMascarado: mascararCartao(digitos),
        titular: String(nome).trim(),
        status: recusado ? 'recusado' : 'aprovado',
        motivo: recusado ? 'Cartão recusado pela operadora (fundos insuficientes).' : null,
        codigoAutorizacao: recusado ? null : crypto.randomBytes(4).toString('hex').toUpperCase(),
        nsu: recusado ? null : String(Date.now()).slice(-9),
        agendamentoId: agendamentoId || null,
        criadoEm: new Date().toISOString()
    };
    db.pagamentos.push(pagamento);

    const http = recusado ? 402 : 201;
    res.status(http).json({
        status: pagamento.status === 'aprovado' ? 'sucesso' : 'recusado',
        dados: limparPagamentoParaResposta(pagamento)
    });
});

// Simula a geração de uma cobrança Pix.
// Body: { valor, agendamentoId? }
app.post('/api/pagamentos/pix', autenticar, (req, res) => {
    const { valor, agendamentoId } = req.body || {};
    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
        return res.status(400).json({ erro: 'Informe um valor maior que zero.' });
    }
    const id = `pag_${crypto.randomBytes(8).toString('hex')}`;
    const txid = crypto.randomBytes(13).toString('hex').toUpperCase().slice(0, 25);
    // "Copia e cola" simulado — não é um BR Code Pix real, é apenas uma string
    // determinística para o cliente mostrar ao usuário.
    const copiaECola = `00020126PIXSIMULADO${txid}5204000053039865802BR5913OndeTem Pay6009SAQUAREMA62070503***6304${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const pagamento = {
        id,
        usuarioEmail: req.usuario.email,
        metodo: 'pix',
        valor: Math.round(valorNum * 100) / 100,
        status: 'aguardando',
        txid,
        copiaECola,
        qrCodeTexto: copiaECola,
        expiraEm,
        agendamentoId: agendamentoId || null,
        criadoEm: new Date().toISOString()
    };
    db.pagamentos.push(pagamento);

    res.status(201).json({ status: 'sucesso', dados: limparPagamentoParaResposta(pagamento) });
});

// Simula a confirmação do pagamento Pix (na vida real viria por webhook do PSP).
app.post('/api/pagamentos/pix/:id/confirmar', autenticar, (req, res) => {
    const p = db.pagamentos.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
    if (p.metodo !== 'pix') {
        return res.status(400).json({ erro: 'Este pagamento não é um Pix.' });
    }
    if (req.usuario.tipo === 'usuario' && p.usuarioEmail !== req.usuario.email) {
        return res.status(403).json({ erro: 'Este pagamento não pertence a você.' });
    }
    if (p.status === 'aprovado') {
        return res.json({ status: 'sucesso', dados: limparPagamentoParaResposta(p), mensagem: 'Pagamento já estava aprovado.' });
    }
    if (p.status !== 'aguardando') {
        return res.status(409).json({ erro: `Pagamento não pode ser confirmado (status atual: ${p.status}).` });
    }
    if (p.expiraEm && new Date(p.expiraEm).getTime() < Date.now()) {
        p.status = 'expirado';
        return res.status(410).json({ erro: 'Cobrança Pix expirada.', dados: limparPagamentoParaResposta(p) });
    }
    p.status = 'aprovado';
    p.pagoEm = new Date().toISOString();
    p.endToEndId = `E${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    res.json({ status: 'sucesso', dados: limparPagamentoParaResposta(p) });
});

// ==========================================
// 4. API — SERVIÇOS / PRODUTOS DA EMPRESA
// ==========================================
app.get('/api/servicos', (req, res) => {
    const empresaId = req.query.empresaId ? Number(req.query.empresaId) : null;
    const lista = empresaId ? db.servicos.filter(s => s.empresaId === empresaId) : db.servicos;
    res.json({ status: 'sucesso', dados: lista });
});

app.get('/api/empresa/servicos', autenticar, exigirTipo('empresa'), (req, res) => {
    res.json({ status: 'sucesso', dados: db.servicos.filter(s => s.empresaId === req.usuario.id) });
});

app.post('/api/empresa/servicos', autenticar, exigirTipo('empresa'), (req, res) => {
    const { nome, preco, duracao } = req.body;
    if (!nome || preco == null) return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
    const novo = { id: Date.now(), empresaId: req.usuario.id, nome, preco: Number(preco), duracao: Number(duracao) || 30 };
    db.servicos.push(novo);
    res.status(201).json({ mensagem: 'Serviço criado', dados: novo });
});

app.put('/api/empresa/servicos/:id', autenticar, exigirTipo('empresa'), (req, res) => {
    const s = db.servicos.find(x => x.id === Number(req.params.id) && x.empresaId === req.usuario.id);
    if (!s) return res.status(404).json({ erro: 'Serviço não encontrado' });
    const { nome, preco, duracao } = req.body;
    if (nome != null) s.nome = nome;
    if (preco != null) s.preco = Number(preco);
    if (duracao != null) s.duracao = Number(duracao);
    res.json({ mensagem: 'Serviço atualizado', dados: s });
});

app.delete('/api/empresa/servicos/:id', autenticar, exigirTipo('empresa'), (req, res) => {
    const idx = db.servicos.findIndex(x => x.id === Number(req.params.id) && x.empresaId === req.usuario.id);
    if (idx < 0) return res.status(404).json({ erro: 'Serviço não encontrado' });
    db.servicos.splice(idx, 1);
    res.json({ mensagem: 'Serviço removido' });
});

// ==========================================
// 5. API — PERFIL DA EMPRESA
// ==========================================
app.get('/api/empresa/perfil', autenticar, exigirTipo('empresa'), (req, res) => {
    const e = db.empresas.find(x => x.id === req.usuario.id);
    if (!e) return res.status(404).json({ erro: 'Empresa não encontrada' });
    const { senha, ...publico } = e;
    res.json({ status: 'sucesso', dados: publico });
});

app.put('/api/empresa/perfil', autenticar, exigirTipo('empresa'), (req, res) => {
    const e = db.empresas.find(x => x.id === req.usuario.id);
    if (!e) return res.status(404).json({ erro: 'Empresa não encontrada' });
    const camposEditaveis = ['nome', 'telefone', 'endereco', 'horario', 'razaoSocial'];
    camposEditaveis.forEach(c => { if (req.body[c] != null) e[c] = req.body[c]; });
    const { senha, ...publico } = e;
    res.json({ mensagem: 'Perfil atualizado', dados: publico });
});

// ==========================================
// 6. API — DASHBOARD DA EMPRESA
// ==========================================
app.get('/api/empresa/dashboard', autenticar, exigirTipo('empresa'), (req, res) => {
    const meus = db.agendamentos.filter(a => a.empresaId === req.usuario.id);
    res.json({
        total: meus.length,
        pendentes: meus.filter(a => a.status === 'pendente').length,
        confirmados: meus.filter(a => a.status === 'confirmado').length,
        concluidos: meus.filter(a => a.status === 'concluido').length,
        recusados: meus.filter(a => a.status === 'recusado').length,
        servicos: db.servicos.filter(s => s.empresaId === req.usuario.id).length,
        recentes: meus.slice(-5).reverse()
    });
});

// ==========================================
// 7. API — USUÁRIOS / EMPRESAS (cadastros)
// ==========================================
app.get('/api/usuarios', (req, res) => res.json({ status: 'sucesso', usuarios: db.usuarios.map(({ senha, ...u }) => u) }));

app.post('/api/usuarios', (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    if (db.usuarios.find(u => u.email === email)) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    const novo = { id: Date.now(), nome, email, senha, tipo: 'usuario' };
    db.usuarios.push(novo);
    const { senha: _, ...publico } = novo;
    res.status(201).json({ mensagem: 'Usuário registrado com sucesso!', dados: publico });
});

app.get('/api/empresas', (req, res) => res.json({ status: 'sucesso', empresas: db.empresas.map(({ senha, ...e }) => e) }));

// Lista pública para o mapa de clientes: apenas empresas com coordenadas válidas.
// Retorna somente campos seguros (sem senha, sem dados internos sensíveis).
app.get('/api/empresas/publicas', (req, res) => {
    const publicas = db.empresas
        .filter(e => e.status !== 'rejeitado'
            && typeof e.lat === 'number' && typeof e.lng === 'number'
            && Number.isFinite(e.lat) && Number.isFinite(e.lng))
        .map(e => ({
            id: e.id,
            nome: e.nome,
            nomeFantasia: e.nomeFantasia || null,
            descricao: e.descricao || '',
            categorias: e.categorias || [],
            servicos: e.servicos || [],
            telefone: e.telefone || '',
            whatsapp: e.whatsapp || '',
            instagram: e.instagram || '',
            endereco: e.endereco || '',
            lat: e.lat,
            lng: e.lng,
            horarioFuncionamento: e.horarioFuncionamento || null,
            status: e.status
        }));
    res.json({ status: 'sucesso', empresas: publicas });
});

app.post('/api/empresas', (req, res) => {
    const {
        nome, cnpj, razaoSocial, nomeFantasia, descricao,
        email, senha, telefone, whatsapp, instagram,
        endereco, lat, lng, categorias, servicos,
        horarioFuncionamento, responsavel
    } = req.body;

    if (!nome || !cnpj || !razaoSocial || !email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    // Localização no mapa é obrigatória: é o que permite mostrar a empresa
    // para usuários que buscam serviços próximos.
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)
        || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return res.status(400).json({ erro: 'Informe a localização da empresa no mapa (latitude/longitude válidas).' });
    }

    if (db.empresas.find(e => e.email === email)) {
        return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const enderecoTexto = endereco && typeof endereco === 'object'
        ? [
            [endereco.rua, endereco.numero].filter(Boolean).join(', '),
            endereco.complemento, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep
          ].filter(Boolean).join(' - ')
        : (typeof endereco === 'string' ? endereco : '');

    const novo = {
        id: Date.now(),
        nome, cnpj, razaoSocial,
        nomeFantasia: nomeFantasia || '',
        descricao: descricao || '',
        email, senha,
        telefone: telefone || '',
        whatsapp: whatsapp || '',
        instagram: instagram || '',
        endereco: enderecoTexto,
        enderecoEstruturado: endereco && typeof endereco === 'object' ? endereco : null,
        lat: latNum,
        lng: lngNum,
        categorias: Array.isArray(categorias) ? categorias : [],
        servicos: Array.isArray(servicos) ? servicos : [],
        horarioFuncionamento: horarioFuncionamento || null,
        responsavel: responsavel || '',
        horario: '',
        status: 'ativo',
        tipo: 'empresa'
    };
    db.empresas.push(novo);

    const { senha: _, ...publico } = novo;
    res.status(201).json({ mensagem: 'Empresa cadastrada com sucesso!', dados: publico });
});

// ==========================================
// Chat IA (Google Gemini) — registra POST /api/chat
// ==========================================
require('./chat').registrarRotas(app);

// ==========================================
// INICIALIZAÇÃO
// ==========================================
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[Sistema] Logins de teste:`);
    console.log(`  Admin    -> admin@ondetem.com / 123456`);
    console.log(`  Empresa  -> empresa@ondetem.com / 123456`);
    console.log(`  Usuário  -> joao@email.com / 123456`);
});
