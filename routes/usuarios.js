// routes/usuarios.js — CRUD routes for regular users
const express = require('express');
const router = express.Router();
const { usuarios, sanitize, emailRegex, proximoId } = require('../store/db');
const { verificarToken, autorizarRoles } = require('../middleware/auth');

// ==========================================
// PUBLIC — Registro de usuário
// ==========================================

// POST /api/usuarios/registro
router.post('/registro', (req, res) => {
    const { nome, email, senha, telefone } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "E-mail inválido." });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });
    }

    const emailExiste = usuarios.find(u => u.email === email);
    if (emailExiste) {
        return res.status(409).json({ erro: "E-mail já cadastrado." });
    }

    const novoUsuario = {
        id: proximoId(usuarios),
        nome: sanitize(nome),
        email: sanitize(email),
        senha: senha, // NOTE: In production, hash with bcrypt
        telefone: sanitize(telefone || ''),
        role: 'usuario',
        ativo: true,
        criadoEm: new Date().toISOString()
    };

    usuarios.push(novoUsuario);

    const { senha: _, ...dadosPublicos } = novoUsuario;
    res.status(201).json({
        mensagem: "Usuário registrado com sucesso!",
        dados: dadosPublicos
    });
});

// NOTE: Login is handled by the unified POST /api/login in server.js
// (with proper rate limiting). Do NOT add a duplicate login route here.

// ==========================================
// PROTECTED — Perfil do próprio usuário
// ==========================================

// GET /api/usuarios/perfil
router.get('/perfil', verificarToken, (req, res) => {
    const usuario = usuarios.find(u => u.id === req.usuario.id);
    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { senha: _, ...dadosPublicos } = usuario;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// PUT /api/usuarios/perfil
router.put('/perfil', verificarToken, (req, res) => {
    const usuario = usuarios.find(u => u.id === req.usuario.id);
    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { nome, telefone, senha } = req.body;

    if (nome) usuario.nome = sanitize(nome);
    if (telefone) usuario.telefone = sanitize(telefone);
    if (senha) {
        if (senha.length < 6) {
            return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });
        }
        usuario.senha = senha;
    }

    const { senha: _, ...dadosPublicos } = usuario;
    res.json({ mensagem: "Perfil atualizado com sucesso!", dados: dadosPublicos });
});

// ==========================================
// PROTECTED — CRUD completo (admin ou próprio usuário)
// ==========================================

// GET /api/usuarios — Listar todos (admin only)
router.get('/', verificarToken, autorizarRoles('admin'), (req, res) => {
    const lista = usuarios.map(({ senha, ...rest }) => rest);
    res.json({ status: 'sucesso', total: lista.length, dados: lista });
});

// GET /api/usuarios/:id — Buscar por ID (admin ou próprio)
router.get('/:id', verificarToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    // Users can only see their own profile; admins can see anyone
    if (req.usuario.role !== 'admin' && req.usuario.id !== id) {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { senha: _, ...dadosPublicos } = usuario;
    res.json({ status: 'sucesso', dados: dadosPublicos });
});

// PUT /api/usuarios/:id — Atualizar (admin ou próprio)
router.put('/:id', verificarToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    if (req.usuario.role !== 'admin' && req.usuario.id !== id) {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    const index = usuarios.findIndex(u => u.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { nome, telefone, senha, ativo } = req.body;

    if (nome) usuarios[index].nome = sanitize(nome);
    if (telefone) usuarios[index].telefone = sanitize(telefone);
    if (senha) {
        if (senha.length < 6) {
            return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });
        }
        usuarios[index].senha = senha;
    }
    // Only admin can change active status
    if (typeof ativo === 'boolean' && req.usuario.role === 'admin') {
        usuarios[index].ativo = ativo;
    }

    const { senha: _, ...dadosPublicos } = usuarios[index];
    res.json({ mensagem: "Usuário atualizado com sucesso!", dados: dadosPublicos });
});

// DELETE /api/usuarios/:id — Remover (admin ou próprio)
router.delete('/:id', verificarToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido." });
    }

    if (req.usuario.role !== 'admin' && req.usuario.id !== id) {
        return res.status(403).json({ erro: "Acesso negado." });
    }

    const index = usuarios.findIndex(u => u.id === id);
    if (index === -1) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const removido = usuarios.splice(index, 1)[0];
    const { senha: _, ...dadosPublicos } = removido;
    res.json({ mensagem: "Usuário removido com sucesso!", dados: dadosPublicos });
});

module.exports = router;
