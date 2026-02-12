import pool from '../database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aplicarCambios = async () => {
    try {
        console.log('📝 Aplicando cambios para campo imagen en tabla acta...');
        
        const sqlPath = path.join(__dirname, '..', 'sql', '03_agregar_imagen_acta.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        
        console.log('✅ Cambios aplicados exitosamente!');
        console.log('   - Campo "imagen_url" agregado');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al aplicar cambios:', error.message);
        process.exit(1);
    }
};

aplicarCambios();
