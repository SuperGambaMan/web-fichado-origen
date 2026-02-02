# 📋 Sistema de Fichajes - Control de Asistencia

Sistema completo de control de fichajes (entrada/salida) para empleados y estudiantes en prácticas.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCCIÓN                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Vercel    │───▶│   Fly.io   │───▶│    Neon     │         │
│  │  (Frontend) │    │  (Backend)  │    │ (PostgreSQL)│         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                     │
│                     ┌──────▼──────┐                             │
│                     │   Upstash   │                             │
│                     │   (Redis)   │                             │
│                     └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        DESARROLLO                                │
├─────────────────────────────────────────────────────────────────┤
│  Docker Compose                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Frontend   │───▶│   Backend   │───▶│  PostgreSQL │         │
│  │  (Next.js)  │    │  (NestJS)   │    │   (Docker)  │         │
│  │  :3000      │    │   :3001     │    │   :5432     │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                     │
│                     ┌──────▼──────┐                             │
│                     │    Redis    │                             │
│                     │   :6379     │                             │
│                     └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker Desktop
- Node.js 20+ (opcional, para desarrollo sin Docker)
- Git

### 1. Clonar y configurar

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd web-fichado-origen

# Copiar variables de entorno
cp .env.example .env
```

### 2. Desarrollo con Docker (Recomendado)

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down
```

**URLs de desarrollo:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs

### 3. Desarrollo sin Docker

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## 📁 Estructura del Proyecto

```
web-fichado-origen/
├── frontend/                 # Next.js 14 + TailwindCSS
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & config
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   └── package.json
│
├── backend/                  # NestJS + TypeORM
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   └── modules/         # Feature modules
│   │       ├── auth/        # Authentication
│   │       ├── users/       # User management
│   │       ├── time-entries/# Time tracking
│   │       ├── audit/       # Audit logs
│   │       └── health/      # Health checks
│   ├── Dockerfile
│   ├── fly.toml             # Fly.io config
│   └── package.json
│
├── infra/                    # Infrastructure files
│   └── init-db/             # Database init scripts
│
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production-like environment
├── .env.example             # Environment template
└── README.md
```

## 🔧 Configuración

### Variables de Entorno

#### Desarrollo (.env)
```env
# PostgreSQL
POSTGRES_USER=fichajes_user
POSTGRES_PASSWORD=fichajes_password
POSTGRES_DB=fichajes_db

# Redis
REDIS_PASSWORD=redis_password

# Auth & Security
JWT_SECRET=your_jwt_secret_min_32_chars
AUTH_SECRET=your_auth_secret_min_32_chars
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars

# URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

#### Producción
Ver `.env.production.example` para las variables necesarias en producción.

## 📚 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Refrescar token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |

### Usuarios (Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/users` | Listar usuarios |
| POST | `/api/v1/users` | Crear usuario |
| GET | `/api/v1/users/:id` | Obtener usuario |
| PATCH | `/api/v1/users/:id` | Actualizar usuario |
| DELETE | `/api/v1/users/:id` | Eliminar usuario |

### Fichajes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/time-entries/clock-in` | Registrar entrada |
| POST | `/api/v1/time-entries/clock-out` | Registrar salida |
| GET | `/api/v1/time-entries/status` | Estado actual |
| GET | `/api/v1/time-entries/my-entries` | Mis fichajes |
| GET | `/api/v1/time-entries` | Todos los fichajes (admin) |

### Auditoría (Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/audit` | Listar logs de auditoría |
| GET | `/api/v1/audit/entity/:type/:id` | Logs por entidad |

## 🚢 Despliegue

### Backend en Fly.io

```bash
cd backend

# Instalar Fly CLI
# Windows: iwr https://fly.io/install.ps1 -useb | iex

# Login
fly auth login

# Crear app
fly apps create fichajes-backend

# Configurar secrets
fly secrets set \
  DATABASE_HOST=your-neon-host.neon.tech \
  DATABASE_USER=your_user \
  DATABASE_PASSWORD=your_password \
  DATABASE_NAME=your_db \
  DATABASE_SSL=true \
  REDIS_HOST=your-upstash-host.upstash.io \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=your_upstash_password \
  JWT_SECRET=your_production_jwt_secret \
  AUTH_SECRET=your_production_auth_secret \
  CORS_ORIGIN=https://your-frontend.vercel.app

# Desplegar
fly deploy
```

### Frontend en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno:
   - `NEXT_PUBLIC_API_URL`: URL de tu backend en Fly.io
   - `NEXTAUTH_URL`: URL de tu app en Vercel
   - `NEXTAUTH_SECRET`: Secret para Auth.js
   - `AUTH_BACKEND_URL`: URL interna del backend

3. Despliega automáticamente con cada push

### Base de Datos en Neon

1. Crea una cuenta en [Neon](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia la connection string
4. Configura como secret en Fly.io

### Redis en Upstash

1. Crea una cuenta en [Upstash](https://upstash.com)
2. Crea una nueva base de datos Redis
3. Copia las credenciales
4. Configura como secrets en Fly.io

## 🛠️ Scripts Útiles

### Backend
```bash
npm run start:dev    # Desarrollo con hot reload
npm run build        # Compilar para producción
npm run start:prod   # Ejecutar en producción
npm run lint         # Linter
npm run test         # Tests
npm run migration:generate  # Generar migración
npm run migration:run       # Ejecutar migraciones
```

### Frontend
```bash
npm run dev     # Desarrollo
npm run build   # Compilar
npm run start   # Producción
npm run lint    # Linter
```

### Docker
```bash
# Desarrollo
docker-compose up -d              # Levantar
docker-compose down               # Parar
docker-compose logs -f backend    # Ver logs
docker-compose exec backend sh    # Shell en container

# Producción local
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Seguridad

- Autenticación JWT con refresh tokens
- Rate limiting por IP
- Validación de datos con class-validator
- Helmet para headers de seguridad
- CORS configurado
- Auditoría completa de acciones
- Contraseñas hasheadas con bcrypt

## 📝 Buenas Prácticas Implementadas

1. **Arquitectura Modular**: Cada feature en su propio módulo
2. **DTOs**: Validación de entrada con class-validator
3. **Entidades**: TypeORM con relaciones bien definidas
4. **Guardias**: Protección de rutas por rol
5. **Interceptores**: Transformación de respuestas
6. **Colas**: Procesamiento asíncrono con Bull
7. **Logging**: Auditoría completa
8. **Testing**: Estructura preparada para tests
9. **Docker**: Multi-stage builds optimizados
10. **CI/CD Ready**: Configuración para despliegue automático

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.
