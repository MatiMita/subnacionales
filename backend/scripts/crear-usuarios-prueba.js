import bcrypt from 'bcrypt';
import pool from '../database.js';

async function crearUsuariosPrueba() {
    try {
        console.log('🔧 Creando usuarios de prueba...\n');

        // 1. Crear personas
        const persona1 = await pool.query(`
      INSERT INTO persona (nombre, apellido_paterno, apellido_materno, ci, celular, email)
      VALUES ('Admin', 'Sistema', 'Principal', '12345678', 70000000, 'admin@sistema.com')
      RETURNING id_persona
    `);

        const persona2 = await pool.query(`
      INSERT INTO persona (nombre, apellido_paterno, apellido_materno, ci, celular, email)
      VALUES ('Operador', 'Prueba', 'Uno', '87654321', 70000001, 'operador@sistema.com')
      RETURNING id_persona
    `);

        console.log('✅ Personas creadas');

        // 2. Obtener IDs de roles
        const roles = await pool.query('SELECT id_rol, nombre FROM rol');
        const rolAdmin = roles.rows.find(r => r.nombre === 'Administrador');
        const rolOperador = roles.rows.find(r => r.nombre === 'Operador');

        if (!rolAdmin || !rolOperador) {
            throw new Error('❌ Los roles no existen. Ejecuta primero 01_crear_tabla_rol.sql');
        }

        console.log('✅ Roles encontrados');

        // 3. Hashear contraseñas
        const passwordAdmin = await bcrypt.hash('admin123', 10);
        const passwordOperador = await bcrypt.hash('operador123', 10);

        console.log('✅ Contraseñas hasheadas');

        // 4. Crear usuarios
        await pool.query(`
      INSERT INTO usuario (nombre_usuario, contrasena, id_rol, id_persona)
      VALUES ($1, $2, $3, $4)
    `, ['admin', passwordAdmin, rolAdmin.id_rol, persona1.rows[0].id_persona]);

        await pool.query(`
      INSERT INTO usuario (nombre_usuario, contrasena, id_rol, id_persona)
      VALUES ($1, $2, $3, $4)
    `, ['operador', passwordOperador, rolOperador.id_rol, persona2.rows[0].id_persona]);

        console.log('✅ Usuarios creados\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 USUARIOS DE PRUEBA CREADOS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n👤 ADMINISTRADOR:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
        console.log('   Rol: Administrador\n');
        console.log('👤 OPERADOR:');
        console.log('   Usuario: operador');
        console.log('   Contraseña: operador123');
        console.log('   Rol: Operador\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

crearUsuariosPrueba();
