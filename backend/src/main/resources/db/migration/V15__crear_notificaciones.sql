-- Fase 2d — Centro de notificaciones in-app
-- Historial consultable de avisos. Funciona sin push: la app lo lee al abrirse.
-- El texto se guarda ya redactado para que el historial no cambie si mañana
-- cambiamos la redaccion de un aviso.
CREATE TABLE notificaciones (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo           VARCHAR(40)  NOT NULL,   -- decide el icono y a donde navega
    titulo         VARCHAR(120) NOT NULL,
    cuerpo         VARCHAR(400) NOT NULL,
    solicitud_id   BIGINT       REFERENCES solicitudes(id) ON DELETE CASCADE,
    leida          BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- La consulta de siempre: "mis notificaciones, las mas nuevas primero".
CREATE INDEX idx_notificaciones_usuario ON notificaciones (usuario_id, fecha_creacion DESC);
