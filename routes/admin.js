// routes/admin.js — Admin-only routes for dashboard and user/company management
const express = require('express');
const router = express.Router();
const { usuarios, empresas, tokens, sanitize } = require('../store/db');
const { verificarToken, autorizarRoles } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(verificarToken);
router.use(autorizarRoles('admin'));

// ==========================================
// DASHBOARD
// ==========================================

// GET /api/admin/dashboard — Overview stats
router.get('/dashboard', (req, res) => {
    const totalUsuarios = usuarios.filter(u => u.role === 'usuario').length;
    const totalEmpresas = empresas.length;
    const empresasAprovadas = empresas.filter(e => e.aprovado).length;
    const empresasPendentes = empresas.filter(e => !e.aprovado).length;
    const usuariosAtivos = usuarios.filter(u => u.role === 'usuario' && u.ativo).length;
    const usuariosInativos = usuarios.filter(u => u.role === 'usuario' && !u.ativo).length;
    const sessoesAtivas = tokens.size;

    res.json({
        status: 'sucesso',
        dados: {
            usuarios: {
                total: totalUsuarios,
                ativos: usuariosAtivos,
                inativos: usuariosInativos
            },
            empresas: {
                total: totalEmpresas,
                aprovadas: empresasAprovadas,
                pendentes: empresasPendentes
            },
            sessoesAtivas
        }
    });
});

// ==========================================
// GERENCIAMENTO DE USUÁRIOS
// ==========================================

// GET /api/admin/usuarios — Listar todos os usuários (com filtros)
router.get('/usuarios', (req, res) => {
    const { role, ativo, busca, page, limit } = req.query;

    let resultado = [...usuarios];

    if (role) {
        resultado = resultado.filter(u => u.role === role);
    }

    if (ativo !== undefined) {
        const isAtivo = ativo === 'true';
        resultado = resultado.filter(u => u.ativo === isAtivo);
    }

    if (busca) {
        const termo = busca.toLowerCase();
        resultado = resultado.filter(u =>
            u.nome.toLowerCase().includes(termo) ||
            u.email.toLowerCase().includes(termo)
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

// GET /api/admin/usuarios/:id — Detalhes de um usuário
router.get('/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { senha: _, ...dadosPublicos } = usuario;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// PUT /api/admin/usuarios/:id/status — Ativar/desativar usuário
router.put('/usuarios/:id/status', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') {
        return res.status(400).json({ erro: "O campo 'ativo' (boolean) é obrigatório." });
    }

    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Prevent admin from deactivating themselves
    if (usuario.id === req.usuario.id) {
        return res.status(400).json({ erro: "Não é possível desativar a própria conta de admin." });
    }

    usuario.ativo = ativo;
    const { senha: _, ...dadosPublicos } = usuario;
    res.json({
        mensagem: ativo ? "Usuário ativado com sucesso!" : "Usuário desativado com sucesso!",
        dados: dadosPublicos
    });
});

// DELETE /api/admin/usuarios/:id — Remover usuário
router.delete('/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    if (id === req.usuario.id) {
        return res.status(400).json({ erro: "Não é possível remover a própria conta de admin." });
    }

    const index = usuarios.findIndex(u => u.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const removido = usuarios.splice(index, 1)[0];
    const { senha: _, ...dadosPublicos } = removido;
    res.json({ mensagem: "Usuário removido com sucesso!", dados: dadosPublicos });
});

// ==========================================
// GERENCIAMENTO DE EMPRESAS
// ==========================================

// GET /api/admin/empresas — Listar todas as empresas (com filtros)
router.get('/empresas', (req, res) => {
    const { aprovado, ativo, busca, page, limit } = req.query;

    let resultado = [...empresas];

    if (aprovado !== undefined) {
        const isAprovado = aprovado === 'true';
        resultado = resultado.filter(e => e.aprovado === isAprovado);
    }

    if (ativo !== undefined) {
        const isAtivo = ativo === 'true';
        resultado = resultado.filter(e => e.ativo === isAtivo);
    }

    if (busca) {
        const termo = busca.toLowerCase();
        resultado = resultado.filter(e =>
            e.nome.toLowerCase().includes(termo) ||
            e.email.toLowerCase().includes(termo) ||
            e.cnpj.includes(termo)
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

// GET /api/admin/empresas/:id — Detalhes de uma empresa
router.get('/empresas/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const empresa = empresas.find(e => e.id === id);
    if (!empresa) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const { senha: _, ...dadosPublicos } = empresa;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// PUT /api/admin/empresas/:id/aprovacao — Aprovar/rejeitar empresa
router.put('/empresas/:id/aprovacao', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const { aprovado } = req.body;
    if (typeof aprovado !== 'boolean') {
        return res.status(400).json({ erro: "O campo 'aprovado' (boolean) é obrigatório." });
    }

    const empresa = empresas.find(e => e.id === id);
    if (!empresa) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    empresa.aprovado = aprovado;
    const { senha: _, ...dadosPublicos } = empresa;
    res.json({
        mensagem: aprovado ? "Empresa aprovada com sucesso!" : "Empresa rejeitada.",
        dados: dadosPublicos
    });
});

// PUT /api/admin/empresas/:id/status — Ativar/desativar empresa
router.put('/empresas/:id/status', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') {
        return res.status(400).json({ erro: "O campo 'ativo' (boolean) é obrigatório." });
    }

    const empresa = empresas.find(e => e.id === id);
    if (!empresa) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    empresa.ativo = ativo;
    const { senha: _, ...dadosPublicos } = empresa;
    res.json({
        mensagem: ativo ? "Empresa ativada com sucesso!" : "Empresa desativada com sucesso!",
        dados: dadosPublicos
    });
});

// DELETE /api/admin/empresas/:id — Remover empresa
router.delete('/empresas/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    const index = empresas.findIndex(e => e.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    const removida = empresas.splice(index, 1)[0];

    // Also remove associated user account
    const userIndex = usuarios.findIndex(u => u.empresaId === id);
    if (userIndex !== -1) {
        usuarios.splice(userIndex, 1);
    }

    const { senha: _, ...dadosPublicos } = removida;
    res.json({ mensagem: "Empresa removida com sucesso!", dados: dadosPublicos });
});

module.exports = router;
