-- Fase 1 — Foto de perfil
-- La imagen vive en MinIO; aquí guardamos solo la clave del objeto.
ALTER TABLE usuarios ADD COLUMN avatar_objeto VARCHAR(255);
