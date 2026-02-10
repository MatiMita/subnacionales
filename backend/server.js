import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import geograficoRoutes from './routes/geografico.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/geografico', geograficoRoutes);

// Ruta de prueba
app.get('/api/ping', (req, res) => {
    res.json({ message: '🏓 Pong! Backend funcionando correctamente' });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
    console.log(`📡 Frontend permitido desde: ${process.env.FRONTEND_URL}`);
    console.log(`\n📋 Rutas disponibles:`);
    console.log(`   - GET  http://localhost:${PORT}/api/ping`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/api/usuarios`);
});
