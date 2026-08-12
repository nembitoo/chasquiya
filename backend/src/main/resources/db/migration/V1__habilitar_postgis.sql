-- Hito 0 — Cimientos
-- Habilita la extensión PostGIS (geolocalización) en la base de datos.
--
-- Aunque la imagen Docker de PostGIS ya la trae activada, dejamos esta
-- migración para que el esquema sea auto-contenido: si mañana se despliega
-- en otra BD (Neon, Supabase, etc.), Flyway la habilita solo.
-- "IF NOT EXISTS" la hace segura de correr varias veces.
CREATE EXTENSION IF NOT EXISTS postgis;
