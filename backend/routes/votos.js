import express from 'express';
import pool from '../database.js';
import { verificarToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Configuración para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer para imágenes de actas
const storageActas = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/actas'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'acta-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadActa = multer({
    storage: storageActas,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (JPEG, PNG) o PDF'));
    }
});

// GET /api/votos - Obtener todos los registros de votos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id_acta,
                a.fecha_registro,
                a.votos_totales,
                a.votos_nulos,
                a.votos_blancos,
                a.estado,
                a.editada,
                a.fecha_ultima_edicion,
                a.imagen_url,
                m.codigo as codigo_mesa,
                m.numero_mesa,
                r.nombre as nombre_recinto,
                g.nombre as nombre_geografico,
                u.nombre_usuario,
                te.nombre as tipo_eleccion
            FROM acta a
            INNER JOIN mesa m ON a.id_mesa = m.id_mesa
            LEFT JOIN recinto r ON m.id_recinto = r.id_recinto
            LEFT JOIN geografico g ON m.id_geografico = g.id_geografico
            LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
            LEFT JOIN tipo_eleccion te ON a.id_tipo_eleccion = te.id_tipo_eleccion
            ORDER BY a.fecha_registro DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener votos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener votos',
            error: error.message
        });
    }
});

// GET /api/votos/recintos - Obtener recintos por geografico
router.get('/recintos', async (req, res) => {
    const { id_geografico } = req.query;

    try {
        let query = `
            SELECT 
                r.id_recinto,
                r.nombre,
                r.direccion,
                r.id_geografico,
                g.nombre as nombre_geografico,
                COUNT(m.id_mesa) as cantidad_mesas
            FROM recinto r
            LEFT JOIN geografico g ON r.id_geografico = g.id_geografico
            LEFT JOIN mesa m ON r.id_recinto = m.id_recinto
        `;

        const params = [];
        if (id_geografico) {
            query += ` WHERE r.id_geografico = $1`;
            params.push(id_geografico);
        }

        query += ` GROUP BY r.id_recinto, r.nombre, r.direccion, r.id_geografico, g.nombre ORDER BY r.nombre`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener recintos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener recintos',
            error: error.message
        });
    }
});

// POST /api/votos/recintos - Crear nuevo recinto
router.post('/recintos', async (req, res) => {
    const { nombre, direccion, id_geografico } = req.body;

    try {
        if (!nombre || !id_geografico) {
            return res.status(400).json({
                success: false,
                message: 'El nombre y el distrito son requeridos'
            });
        }

        const result = await pool.query(`
            INSERT INTO recinto (nombre, direccion, id_geografico)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [nombre, direccion, id_geografico]);

        res.json({
            success: true,
            message: 'Recinto creado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al crear recinto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear recinto',
            error: error.message
        });
    }
});

// PUT /api/votos/recintos/:id - Actualizar recinto
router.put('/recintos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, id_geografico } = req.body;

    try {
        const result = await pool.query(`
            UPDATE recinto
            SET nombre = $1, direccion = $2, id_geografico = $3
            WHERE id_recinto = $4
            RETURNING *
        `, [nombre, direccion, id_geografico, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recinto no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Recinto actualizado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al actualizar recinto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar recinto',
            error: error.message
        });
    }
});

// DELETE /api/votos/recintos/:id - Eliminar recinto
router.delete('/recintos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM recinto WHERE id_recinto = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recinto no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Recinto eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar recinto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar recinto',
            error: error.message
        });
    }
});

// GET /api/votos/mesas - Obtener mesas por recinto
router.get('/mesas', async (req, res) => {
    const { id_recinto } = req.query;

    try {
        let query = `
            SELECT 
                m.id_mesa,
                m.codigo,
                m.descripcion,
                m.numero_mesa,
                m.id_recinto,
                r.nombre as nombre_recinto,
                COUNT(a.id_acta) as actas_registradas
            FROM mesa m
            LEFT JOIN recinto r ON m.id_recinto = r.id_recinto
            LEFT JOIN acta a ON m.id_mesa = a.id_mesa
        `;

        const params = [];
        if (id_recinto) {
            query += ` WHERE m.id_recinto = $1`;
            params.push(id_recinto);
        }

        query += ` GROUP BY m.id_mesa, m.codigo, m.descripcion, m.numero_mesa, m.id_recinto, r.nombre ORDER BY m.numero_mesa`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener mesas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener mesas',
            error: error.message
        });
    }
});

// POST /api/votos/mesas - Crear nueva mesa
router.post('/mesas', async (req, res) => {
    const { codigo, descripcion, numero_mesa, id_recinto } = req.body;

    try {
        if (!codigo || !numero_mesa || !id_recinto) {
            return res.status(400).json({
                success: false,
                message: 'El código, número de mesa y recinto son requeridos'
            });
        }

        // Verificar si el código ya existe
        const existingMesa = await pool.query(
            'SELECT * FROM mesa WHERE codigo = $1',
            [codigo]
        );

        if (existingMesa.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una mesa con ese código'
            });
        }

        const result = await pool.query(`
            INSERT INTO mesa (codigo, descripcion, numero_mesa, id_recinto)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [codigo, descripcion, numero_mesa, id_recinto]);

        res.json({
            success: true,
            message: 'Mesa creada exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al crear mesa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear mesa',
            error: error.message
        });
    }
});

// PUT /api/votos/mesas/:id - Actualizar mesa
router.put('/mesas/:id', async (req, res) => {
    const { id } = req.params;
    const { codigo, descripcion, numero_mesa, id_recinto } = req.body;

    try {
        const result = await pool.query(`
            UPDATE mesa
            SET codigo = $1, descripcion = $2, numero_mesa = $3, id_recinto = $4
            WHERE id_mesa = $5
            RETURNING *
        `, [codigo, descripcion, numero_mesa, id_recinto, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mesa no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Mesa actualizada exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar mesa',
            error: error.message
        });
    }
});

// DELETE /api/votos/mesas/:id - Eliminar mesa
router.delete('/mesas/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar si tiene actas registradas
        const actas = await pool.query(
            'SELECT COUNT(*) as total FROM acta WHERE id_mesa = $1',
            [id]
        );

        if (parseInt(actas.rows[0].total) > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la mesa porque tiene actas registradas'
            });
        }

        const result = await pool.query(
            'DELETE FROM mesa WHERE id_mesa = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mesa no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Mesa eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar mesa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar mesa',
            error: error.message
        });
    }
});

// GET /api/votos/frentes - Obtener todos los frentes políticos
router.get('/frentes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_frente,
                nombre,
                siglas,
                color,
                logo
            FROM frente_politico
            ORDER BY nombre
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener frentes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener frentes políticos',
            error: error.message
        });
    }
});

// POST /api/votos/registrar-acta - Registrar un acta completa con votos
router.post('/registrar-acta', verificarToken, uploadActa.single('imagen_acta'), async (req, res) => {
    let {
        id_mesa,
        id_tipo_eleccion,
        votos_nulos,
        votos_blancos,
        observaciones,
        votos_alcalde,
        votos_concejal
    } = req.body;
    
    // Parsear JSON strings si vienen de FormData
    if (typeof votos_alcalde === 'string') {
        votos_alcalde = JSON.parse(votos_alcalde);
    }
    if (typeof votos_concejal === 'string') {
        votos_concejal = JSON.parse(votos_concejal);
    }

    // Obtener id_usuario del token JWT decodificado
    const id_usuario = req.usuario.id_usuario;
    
    // Obtener URL de la imagen si fue subida
    const imagen_url = req.file ? `/uploads/actas/${req.file.filename}` : null;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Validaciones
        if (!id_mesa) {
            throw new Error('El ID de mesa es requerido');
        }

        // Calcular totales
        const votosValidosAlcalde = votos_alcalde?.reduce((sum, v) => sum + (v.cantidad || 0), 0) || 0;
        const votosValidosConcejal = votos_concejal?.reduce((sum, v) => sum + (v.cantidad || 0), 0) || 0;
        const votosValidos = votosValidosAlcalde + votosValidosConcejal;
        const votosTotales = votosValidos + (votos_nulos || 0) + (votos_blancos || 0);

        // Insertar acta
        const actaResult = await client.query(`
            INSERT INTO acta (
                id_mesa,
                id_tipo_eleccion,
                id_usuario,
                votos_totales,
                votos_validos,
                votos_nulos,
                votos_blancos,
                observaciones,
                estado,
                imagen_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id_acta
        `, [
            id_mesa,
            id_tipo_eleccion || 1,
            id_usuario,
            votosTotales,
            votosValidos,
            votos_nulos || 0,
            votos_blancos || 0,
            observaciones || null,
            'registrada',
            imagen_url
        ]);

        const id_acta = actaResult.rows[0].id_acta;

        // Insertar votos de alcalde
        if (votos_alcalde && votos_alcalde.length > 0) {
            for (const voto of votos_alcalde) {
                if (voto.cantidad > 0) {
                    await client.query(`
                        INSERT INTO voto (id_acta, id_frente, cantidad, tipo_cargo)
                        VALUES ($1, $2, $3, $4)
                    `, [id_acta, voto.id_frente, voto.cantidad, 'alcalde']);
                }
            }
        }

        // Insertar votos de concejal
        if (votos_concejal && votos_concejal.length > 0) {
            for (const voto of votos_concejal) {
                if (voto.cantidad > 0) {
                    await client.query(`
                        INSERT INTO voto (id_acta, id_frente, cantidad, tipo_cargo)
                        VALUES ($1, $2, $3, $4)
                    `, [id_acta, voto.id_frente, voto.cantidad, 'concejal']);
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Acta registrada exitosamente',
            data: {
                id_acta,
                votos_totales: votosTotales,
                votos_validos: votosValidos
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar acta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar acta',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// PUT /api/votos/acta/:id - Editar un acta existente
router.put('/acta/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const {
        votos_nulos,
        votos_blancos,
        observaciones,
        votos_alcalde,
        votos_concejal,
        estado
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el acta existe
        const actaExistente = await client.query(
            'SELECT * FROM acta WHERE id_acta = $1',
            [id]
        );

        if (actaExistente.rows.length === 0) {
            throw new Error('Acta no encontrada');
        }

        // Calcular totales
        const votosValidosAlcalde = votos_alcalde?.reduce((sum, v) => sum + (v.cantidad || 0), 0) || 0;
        const votosValidosConcejal = votos_concejal?.reduce((sum, v) => sum + (v.cantidad || 0), 0) || 0;
        const votosValidos = votosValidosAlcalde + votosValidosConcejal;
        const votosTotales = votosValidos + (votos_nulos || 0) + (votos_blancos || 0);

        // Actualizar el acta existente
        await client.query(`
            UPDATE acta
            SET votos_totales = $1,
                votos_validos = $2,
                votos_nulos = $3,
                votos_blancos = $4,
                observaciones = $5,
                estado = COALESCE($6, estado),
                editada = TRUE,
                fecha_ultima_edicion = CURRENT_TIMESTAMP
            WHERE id_acta = $7
        `, [
            votosTotales,
            votosValidos,
            votos_nulos || 0,
            votos_blancos || 0,
            observaciones || null,
            estado,
            id
        ]);

        // Eliminar votos anteriores
        await client.query('DELETE FROM voto WHERE id_acta = $1', [id]);

        // Insertar nuevos votos de alcalde
        if (votos_alcalde && votos_alcalde.length > 0) {
            for (const voto of votos_alcalde) {
                if (voto.cantidad > 0) {
                    await client.query(`
                        INSERT INTO voto (id_acta, id_frente, cantidad, tipo_cargo)
                        VALUES ($1, $2, $3, $4)
                    `, [id, voto.id_frente, voto.cantidad, 'alcalde']);
                }
            }
        }

        // Insertar nuevos votos de concejal
        if (votos_concejal && votos_concejal.length > 0) {
            for (const voto of votos_concejal) {
                if (voto.cantidad > 0) {
                    await client.query(`
                        INSERT INTO voto (id_acta, id_frente, cantidad, tipo_cargo)
                        VALUES ($1, $2, $3, $4)
                    `, [id, voto.id_frente, voto.cantidad, 'concejal']);
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Acta editada exitosamente',
            data: {
                id_acta: id,
                votos_totales: votosTotales,
                votos_validos: votosValidos,
                editada: true
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al editar acta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al editar acta',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// GET /api/votos/acta/:id - Obtener detalle de un acta
router.get('/acta/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener información del acta
        const actaResult = await pool.query(`
            SELECT 
                a.*,
                m.codigo as codigo_mesa,
                m.numero_mesa,
                r.nombre as nombre_recinto,
                g.nombre as nombre_geografico,
                u.nombre_usuario,
                te.nombre as tipo_eleccion
            FROM acta a
            INNER JOIN mesa m ON a.id_mesa = m.id_mesa
            LEFT JOIN recinto r ON m.id_recinto = r.id_recinto
            LEFT JOIN geografico g ON m.id_geografico = g.id_geografico
            LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
            LEFT JOIN tipo_eleccion te ON a.id_tipo_eleccion = te.id_tipo_eleccion
            WHERE a.id_acta = $1
        `, [id]);

        if (actaResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        // Obtener votos del acta
        const votosResult = await pool.query(`
            SELECT 
                v.id_voto,
                v.id_frente,
                v.cantidad,
                v.tipo_cargo,
                f.nombre as nombre_frente,
                f.siglas,
                f.color
            FROM voto v
            INNER JOIN frente_politico f ON v.id_frente = f.id_frente
            WHERE v.id_acta = $1
            ORDER BY v.tipo_cargo, f.nombre
        `, [id]);

        res.json({
            success: true,
            data: {
                acta: actaResult.rows[0],
                votos: votosResult.rows
            }
        });

    } catch (error) {
        console.error('Error al obtener acta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener acta',
            error: error.message
        });
    }
});

// GET /api/votos/resultados-vivo - Obtener resultados en tiempo real
router.get('/resultados-vivo', async (req, res) => {
    try {
        // Obtener votos agregados por frente político
        const resultadosQuery = await pool.query(`
            SELECT 
                f.id_frente,
                f.nombre,
                f.siglas,
                f.color,
                SUM(v.cantidad) as total_votos,
                SUM(CASE WHEN v.tipo_cargo = 'alcalde' THEN v.cantidad ELSE 0 END) as votos_alcalde,
                SUM(CASE WHEN v.tipo_cargo = 'concejal' THEN v.cantidad ELSE 0 END) as votos_concejal,
                COUNT(DISTINCT v.id_acta) as actas_con_votos
            FROM frente_politico f
            LEFT JOIN voto v ON f.id_frente = v.id_frente
            GROUP BY f.id_frente, f.nombre, f.siglas, f.color
            HAVING SUM(v.cantidad) > 0
            ORDER BY total_votos DESC
        `);

        // Obtener resumen de actas
        const resumenQuery = await pool.query(`
            SELECT 
                COUNT(*) as total_actas,
                SUM(votos_totales) as total_votos,
                SUM(votos_nulos) as votos_nulos,
                SUM(votos_blancos) as votos_blancos,
                COUNT(CASE WHEN estado = 'validada' THEN 1 END) as actas_validadas
            FROM acta
        `);

        const resumen = resumenQuery.rows[0] || {
            total_actas: 0,
            total_votos: 0,
            votos_nulos: 0,
            votos_blancos: 0,
            actas_validadas: 0
        };

        res.json({
            success: true,
            data: {
                resultados: resultadosQuery.rows,
                resumen: {
                    totalActas: parseInt(resumen.total_actas) || 0,
                    totalVotos: parseInt(resumen.total_votos) || 0,
                    votosNulos: parseInt(resumen.votos_nulos) || 0,
                    votosBlancos: parseInt(resumen.votos_blancos) || 0,
                    actasValidadas: parseInt(resumen.actas_validadas) || 0
                }
            }
        });

    } catch (error) {
        console.error('Error al obtener resultados en vivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resultados',
            error: error.message
        });
    }
});

export default router;
