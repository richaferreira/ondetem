// middleware/auth.js — Authentication and role-based authorization
const { buscarPorToken } = require('../store/db');

/**
 * Verifies the Bearer token and attaches user info to req.usuario.
 */
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: "Token de autenticação não fornecido." });
    }
    const token = authHeader.split(' ')[1];
    const sessao = buscarPorToken(token);
    if (!sessao) {
        return res.status(401).json({ erro: "Token inválido ou expirado." });
    }
    req.usuario = sessao; // { id, role, email }
    next();
}

/**
 * Factory: returns middleware that checks if the authenticated user
 * has one of the allowed roles.
 * Usage: autorizarRoles('admin') or autorizarRoles('admin', 'empresa')
 */
function autorizarRoles(...roles) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ erro: "Token de autenticação não fornecido." });
        }
        if (!roles.includes(req.usuario.role)) {
            return res.status(403).json({ erro: "Acesso negado. Permissão insuficiente." });
        }
        next();
    };
}

module.exports = { verificarToken, autorizarRoles };
