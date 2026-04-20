// routes/empresas.js — CRUD routes for companies (empresas)
const express = require('express');
const router = express.Router();
const { empresas, usuarios, sanitize, emailRegex, gerarToken, proximoId } = require('../store/db');
const { verificarToken, autorizarRoles } = require('../middleware/auth');

// ==========================================
// PUBLIC — Registro de empresa
// ==========================================

// POST /api/empresas/registro
router.post('/registro', (req, res) => {
    const { nome, email, senha, telefone, cnpj, endereco, categorias, descricao } = req.body;

    if (!nome || !email || !senha || !cnpj) {
        return res.status(400).json({ erro: "Nome, e-mail, senha e CNPJ são obrigatórios." });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "E-mail inválido." });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });
    }

    // Check duplicate email across both usuarios and empresas
    const emailExisteUsuario = usuarios.find(u => u.email === email);
    const emailExisteEmpresa = empresas.find(e => e.email === email);
    if (emailExisteUsuario || emailExisteEmpresa) {
        return res.status(409).json({ erro: "E-mail já cadastrado." });
    }

    const cnpjExiste = empresas.find(e => e.cnpj === cnpj);
    if (cnpjExiste) {
        return res.status(409).json({ erro: "CNPJ já cadastrado." });
    }

    const novaEmpresa = {
        id: proximoId(empresas),
        nome: sanitize(nome),
        email: sanitize(email),
        senha: senha, // NOTE: In production, hash with bcrypt
        telefone: sanitize(telefone || ''),
        cnpj: sanitize(cnpj),
        endereco: sanitize(endereco || ''),
        descricao: sanitize(descricao || ''),
        categorias: Array.isArray(categorias) ? categorias.map(c => sanitize(c)) : [],
        servicos: [],
        role: 'empresa',
        ativo: true,
        aprovado: false, // Requires admin approval
        criadoEm: new Date().toISOString()
    };

    empresas.push(novaEmpresa);

    // Also add to usuarios store so login works
    usuarios.push({
        id: proximoId(usuarios),
        nome: novaEmpresa.nome,
        email: novaEmpresa.email,
        senha: novaEmpresa.senha,
        telefone: novaEmpresa.telefone,
        role: 'empresa',
        empresaId: novaEmpresa.id,
        ativo: true,
        criadoEm: novaEmpresa.criadoEm
    });

    const { senha: _, ...dadosPublicos } = novaEmpresa;
    res.status(201).json({
        mensagem: "Empresa registrada com sucesso! Aguarde aprovação do administrador.",
        dados: dadosPublicos
    });
});

// ==========================================
// PUBLIC — Listar e buscar empresas
// ==========================================

// GET /api/empresas — Listar empresas aprovadas (público)
router.get('/', (req, res) => {
    const { categoria, busca, page, limit } = req.query;

    let resultado = empresas.filter(e => e.ativo && e.aprovado);

    if (categoria) {
        resultado = resultado.filter(e =>
            e.categorias.some(c => c.toLowerCase() === categoria.toLowerCase())
        );
    }

    if (busca) {
        const termo = busca.toLowerCase();
        resultado = resultado.filter(e =>
            e.nome.toLowerCase().includes(termo) ||
            e.descricao.toLowerCase().includes(termo) ||
            e.categorias.some(c => c.toLowerCase().includes(termo))
        );
    }

    // Pagination
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const porPagina = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const inicio = (pagina - 1) * porPagina;
    const paginado = resultado.slice(inicio, inicio + porPagina);

    const lista = paginado.map(({ senha, ...rest }) => rest);
    res.json({
        status: 'sucesso',
        total: resultado.length,
        pagina,
        porPagina,
        dados: lista
    });
});

// GET /api/empresas/:id — Detalhes de uma empresa (público)
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const empresa = empresas.find(e => e.id === id && e.ativo && e.aprovado);
    if (!empresa) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const { senha: _, ...dadosPublicos } = empresa;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// ==========================================
// PROTECTED — Perfil da própria empresa
// ==========================================

// GET /api/empresas/perfil/me
router.get('/perfil/me', verificarToken, autorizarRoles('empresa'), (req, res) => {
    const usuarioEmpresa = usuarios.find(u => u.id === req.usuario.id);
    if (!usuarioEmpresa || !usuarioEmpresa.empresaId) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const empresa = empresas.find(e => e.id === usuarioEmpresa.empresaId);
    if (!empresa) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const { senha: _, ...dadosPublicos } = empresa;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// ==========================================
// PROTECTED — Atualizar empresa (dono ou admin)
// ==========================================

// PUT /api/empresas/:id
router.put('/:id', verificarToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    // Check ownership or admin
    const usuarioEmpresa = usuarios.find(u => u.id === req.usuario.id);
    const isOwner = usuarioEmpresa && usuarioEmpresa.empresaId === id;
    const isAdmin = req.usuario.role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    const index = empresas.findIndex(e => e.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const { nome, telefone, endereco, descricao, categorias, servicos } = req.body;

    if (nome) empresas[index].nome = sanitize(nome);
    if (telefone) empresas[index].telefone = sanitize(telefone);
    if (endereco) empresas[index].endereco = sanitize(endereco);
    if (descricao) empresas[index].descricao = sanitize(descricao);
    if (Array.isArray(categorias)) {
        empresas[index].categorias = categorias.map(c => sanitize(c));
    }
    if (Array.isArray(servicos)) {
        empresas[index].servicos = servicos.map(s => ({
            nome: sanitize(s.nome || ''),
            preco: parseFloat(s.preco) || 0
        }));
    }

    const { senha: _, ...dadosPublicos } = empresas[index];
    res.json({ mensagem: "Empresa atualizada com sucesso!", dados: dadosPublicos });
});

// DELETE /api/empresas/:id — Remover (dono ou admin)
router.delete('/:id', verificarToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const usuarioEmpresa = usuarios.find(u => u.id === req.usuario.id);
    const isOwner = usuarioEmpresa && usuarioEmpresa.empresaId === id;
    const isAdmin = req.usuario.role === 'admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    const index = empresas.findIndex(e => e.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const removida = empresas.splice(index, 1)[0];

    // Also remove from usuarios
    const userIndex = usuarios.findIndex(u => u.empresaId === id);
    if (userIndex !== -1) {
        usuarios.splice(userIndex, 1);
    }

    const { senha: _, ...dadosPublicos } = removida;
    res.json({ mensagem: "Empresa removida com sucesso!", dados: dadosPublicos });
});

module.exports = router;
