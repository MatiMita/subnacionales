import express from 'express';
import pool from '../database.js';

const router = express.Router();

// GET /api/geografico - Obtener todos los registros geográficos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        g.id_geografico,
        g.nombre,
        g.codigo,
        g.ubicacion,
        g.tipo,
        g.fk_id_geografico,
        padre.nombre as nombre_padre
      FROM geografico g
      LEFT JOIN geografico padre ON g.fk_id_geografico = padre.id_geografico
      ORDER BY g.tipo, g.nombre
    `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener registros geográficos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener registros geográficos',
            error: error.message
        });
    }
});

// GET /api/geografico/tipos - Obtener tipos únicos
router.get('/tipos', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT DISTINCT tipo
      FROM geografico
      WHERE tipo IS NOT NULL
      ORDER BY tipo
    `);

        res.json({
            success: true,
            data: result.rows.map(r => r.tipo)
        });

    } catch (error) {
        console.error('Error al obtener tipos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tipos',
            error: error.message
        });
    }
});

// GET /api/geografico/padres - Obtener posibles padres (para jerarquía)
router.get('/padres', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id_geografico, nombre, tipo
      FROM geografico
      ORDER BY tipo, nombre
    `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al obtener padres:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener padres',
            error: error.message
        });
    }
});

// POST /api/geografico - Crear nuevo registro geográfico
router.post('/', async (req, res) => {
    const { nombre, codigo, ubicacion, tipo, fk_id_geografico } = req.body;

    try {
        // Validaciones
        if (!nombre || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'El nombre y tipo son requeridos'
            });
        }

        // Verificar si ya existe
        const existe = await pool.query(
            'SELECT id_geografico FROM geografico WHERE nombre = $1 AND tipo = $2',
            [nombre, tipo]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un registro con ese nombre y tipo'
            });
        }

        // Crear registro
        const result = await pool.query(`
      INSERT INTO geografico (nombre, codigo, ubicacion, tipo, fk_id_geografico)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nombre, codigo || null, ubicacion || null, tipo, fk_id_geografico || null]);

        res.status(201).json({
            success: true,
            message: 'Registro geográfico creado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al crear registro geográfico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear registro geográfico',
            error: error.message
        });
    }
});

// PUT /api/geografico/:id - Actualizar registro geográfico
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, codigo, ubicacion, tipo, fk_id_geografico } = req.body;

    try {
        // Validaciones
        if (!nombre || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'El nombre y tipo son requeridos'
            });
        }

        // Verificar que existe
        const existe = await pool.query(
            'SELECT id_geografico FROM geografico WHERE id_geografico = $1',
            [id]
        );

        if (existe.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro geográfico no encontrado'
            });
        }

        // Actualizar
        const result = await pool.query(`
      UPDATE geografico
      SET nombre = $1, codigo = $2, ubicacion = $3, tipo = $4, fk_id_geografico = $5
      WHERE id_geografico = $6
      RETURNING *
    `, [nombre, codigo || null, ubicacion || null, tipo, fk_id_geografico || null, id]);

        res.json({
            success: true,
            message: 'Registro geográfico actualizado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al actualizar registro geográfico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar registro geográfico',
            error: error.message
        });
    }
});

// DELETE /api/geografico/:id - Eliminar registro geográfico
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar si tiene hijos
        const tieneHijos = await pool.query(
            'SELECT COUNT(*) as count FROM geografico WHERE fk_id_geografico = $1',
            [id]
        );

        if (parseInt(tieneHijos.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar porque tiene registros dependientes'
            });
        }

        // Eliminar
        const result = await pool.query(
            'DELETE FROM geografico WHERE id_geografico = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro geográfico no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Registro geográfico eliminado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al eliminar registro geográfico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar registro geográfico',
            error: error.message
        });
    }
});

// GET /api/geografico/:id - Obtener un registro por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
      SELECT 
        g.id_geografico,
        g.nombre,
        g.codigo,
        g.ubicacion,
        g.tipo,
        g.fk_id_geografico,
        padre.nombre as nombre_padre
      FROM geografico g
      LEFT JOIN geografico padre ON g.fk_id_geografico = padre.id_geografico
      WHERE g.id_geografico = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro geográfico no encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error al obtener registro geográfico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener registro geográfico',
            error: error.message
        });
    }
});

export default router;
