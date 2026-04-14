// store/db.js — In-memory data store for usuarios, empresas, and sessions
const crypto = require('crypto');

// ==========================================
// DATA STORES
// ==========================================

const usuarios = [];
const empresas = [];
const tokens = new Map(); // token -> { id, role, email }

// Seed the admin user from env vars
function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const existing = usuarios.find(u => u.email === adminEmail);
        if (!existing) {
            usuarios.push({
                id: 1,
                nome: 'Administrador',
                email: adminEmail,
                senha: adminPassword,
                telefone: '',
                role: 'admin',
                ativo: true,
                criadoEm: new Date().toISOString()
            });
        }
    }
}

// ==========================================
// HELPERS
// ==========================================

const sanitize = (str) => String(str).replace(/[<>"'&]/g, '');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gerarToken(userId, role, email) {
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, { id: userId, role, email });
    return token;
}

function buscarPorToken(token) {
    return tokens.get(token) || null;
}

function proximoId(lista) {
    if (lista.length === 0) return 1;
    return Math.max(...lista.map(item => item.id)) + 1;
}

module.exports = {
    usuarios,
    empresas,
    tokens,
    seedAdmin,
    sanitize,
    emailRegex,
    gerarToken,
    buscarPorToken,
    proximoId
};
