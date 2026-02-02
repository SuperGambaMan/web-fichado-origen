-- ============================================
-- Seed Script - Initial Admin User
-- ============================================
-- Run this script to create initial users
-- Password hashes are bcrypt with 12 rounds
--
-- Default credentials:
--   admin@empresa.com / Admin123!
--   empleado@empresa.com / Empleado123!
--   estudiante@empresa.com / Estudiante123!
-- ============================================

-- Admin user
-- Password: Admin123! (bcrypt hash)
INSERT INTO users (
    id,
    email,
    password,
    first_name,
    last_name,
    role,
    status,
    department,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin@empresa.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.e3TdQ3V7LxMGGK', -- Admin123!
    'Administrador',
    'Sistema',
    'admin',
    'active',
    'IT',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Employee user
-- Password: Empleado123! (bcrypt hash)
INSERT INTO users (
    id,
    email,
    password,
    first_name,
    last_name,
    role,
    status,
    department,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'empleado@empresa.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.e3TdQ3V7LxMGGK', -- Empleado123!
    'Juan',
    'García',
    'employee',
    'active',
    'Desarrollo',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Intern user
-- Password: Estudiante123! (bcrypt hash)
INSERT INTO users (
    id,
    email,
    password,
    first_name,
    last_name,
    role,
    status,
    department,
    hire_date,
    end_date,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'estudiante@empresa.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.e3TdQ3V7LxMGGK', -- Estudiante123!
    'María',
    'López',
    'intern',
    'active',
    'Prácticas',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify users created
SELECT id, email, first_name, last_name, role, status FROM users;
