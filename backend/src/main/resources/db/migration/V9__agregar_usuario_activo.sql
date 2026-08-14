-- Hito 8 — Backoffice
-- Un usuario suspendido por el admin no puede iniciar sesión.
ALTER TABLE usuarios ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
