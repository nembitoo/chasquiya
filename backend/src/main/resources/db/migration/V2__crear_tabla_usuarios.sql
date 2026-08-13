-- Hito 1 — Identidad
-- Tabla de usuarios (clientes y maestros comparten esta tabla; los distingue el rol).
-- La contraseña NUNCA se guarda en texto plano: se almacena su hash BCrypt.
CREATE TABLE usuarios (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(80)  NOT NULL,
    apellido        VARCHAR(80)  NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    password_hash   VARCHAR(100) NOT NULL,
    rol             VARCHAR(20)  NOT NULL,          -- CLIENTE | MAESTRO
    acepto_terminos BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
