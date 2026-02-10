import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    try {
        // Buscar usuario con JOIN a persona y rol
        const result = await pool.query(`
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.contrasena,
        u.id_rol,
        u.id_persona,
        u.fecha_fin,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.celular,
        p.email,
        r.nombre as rol_nombre,
        r.descripcion as rol_descripcion
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.nombre_usuario = $1
    `, [nombre_usuario]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = result.rows[0];

        // Verificar si la cuenta está activa (fecha_fin)
        if (usuario.fecha_fin && new Date(usuario.fecha_fin) < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta expirada'
            });
        }

        // Verificar contraseña con bcrypt
        const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                rol: usuario.rol_nombre
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Eliminar contraseña del objeto usuario antes de enviarlo
        delete usuario.contrasena;

        res.json({
            success: true,
            data: {
                token,
                usuario: {
                    id_usuario: usuario.id_usuario,
                    nombre_usuario: usuario.nombre_usuario,
                    rol: usuario.rol_nombre,
                    rol_descripcion: usuario.rol_descripcion,
                    persona: {
                        id_persona: usuario.id_persona,
                        nombre: usuario.nombre,
                        apellido_paterno: usuario.apellido_paterno,
                        apellido_materno: usuario.apellido_materno,
                        ci: usuario.ci,
                        celular: usuario.celular,
                        email: usuario.email
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', async (req, res) => {
    try {
        // Extraer token del header
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Obtener usuario de la BD con JOIN
        const result = await pool.query(`
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.id_rol,
        u.id_persona,
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.celular,
        p.email,
        r.nombre as rol_nombre,
        r.descripcion as rol_descripcion
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `, [decoded.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = result.rows[0];

        res.json({
            success: true,
            data: {
                id_usuario: usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                rol: usuario.rol_nombre,
                rol_descripcion: usuario.rol_descripcion,
                persona: {
                    id_persona: usuario.id_persona,
                    nombre: usuario.nombre,
                    apellido_paterno: usuario.apellido_paterno,
                    apellido_materno: usuario.apellido_materno,
                    ci: usuario.ci,
                    celular: usuario.celular,
                    email: usuario.email
                }
            }
        });

    } catch (error) {
        console.error('Error en /me:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido',
            error: error.message
        });
    }
});

export default router;
