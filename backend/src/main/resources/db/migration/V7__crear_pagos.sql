-- Hito 6 — Cierre y pago simulado
-- Registro del pago de un servicio y de la comisión de la plataforma.
-- NUNCA se guardan datos de tarjeta: el pago es simulado y solo dejamos el registro contable.
CREATE TABLE pagos (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id         BIGINT      NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
    monto_servicio       INT         NOT NULL,   -- lo que paga el cliente (CLP), = cotización
    porcentaje_comision  INT         NOT NULL,   -- % vigente al momento del pago
    comision             INT         NOT NULL,   -- lo que retiene la plataforma
    monto_maestro        INT         NOT NULL,   -- lo que recibe el maestro
    metodo               VARCHAR(20) NOT NULL DEFAULT 'SIMULADO',
    fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_fecha ON pagos (fecha_creacion);
