# Backend - Sistema Electoral

## 📋 Configuración Inicial

### 1. Configurar Variables de Entorno

Edita el archivo `.env` con tus credenciales de PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_de_tu_base_de_datos
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres

PORT=3000
JWT_SECRET=cambia_esto_por_un_secreto_seguro
FRONTEND_URL=http://localhost:5173
```

### 2. Instalar Dependencias

```bash
cd backend
npm install
```

### 3. Iniciar el Servidor

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## 🔧 Ajustes Necesarios

### Según tu Base de Datos

Debes ajustar los archivos en `routes/` según la estructura de tu BD:

#### En `routes/auth.js`:
- Línea 15: Nombre de la tabla de usuarios
- Línea 16: Nombre del campo de usuario
- Línea 28: Nombre del campo de contraseña
- Línea 45: Nombre del campo ID

#### En `routes/usuarios.js`:
- Línea 12: Query para obtener usuarios (agregar JOINs si tienes relaciones)

### Si tus contraseñas están hasheadas

En `routes/auth.js` línea 31, cambia:
```javascript
const validPassword = contrasena === usuario.contrasena; // Sin hash
```

Por:
```javascript
const validPassword = await bcrypt.compare(contrasena, usuario.contrasena); // Con hash
```

## 📡 Endpoints Disponibles

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual (requiere token)

### Usuarios
- `GET /api/usuarios` - Listar todos los usuarios
- `GET /api/usuarios/:id` - Obtener usuario por ID

### Prueba
- `GET /api/ping` - Verificar que el servidor funciona

## 🧪 Probar el Backend

```bash
# Probar conexión
curl http://localhost:3000/api/ping

# Probar login (ajusta los datos según tu BD)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombre_usuario":"admin","contrasena":"123456"}'
```

## 🔐 Seguridad

**IMPORTANTE**: Antes de producción:
1. Cambia `JWT_SECRET` por algo muy seguro
2. Usa HTTPS
3. Hashea las contraseñas con bcrypt
4. Implementa rate limiting
5. Valida todos los inputs
