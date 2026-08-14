// Tipos que reflejan los datos que intercambiamos con el backend.

export type Rol = 'CLIENTE' | 'MAESTRO' | 'ADMIN';

export type RegistroData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  rol: Rol;
  aceptoTerminos: boolean;
};

export type LoginData = {
  email: string;
  password: string;
};

/** Respuesta de /auth/registro y /auth/login. */
export type AuthResponse = {
  token: string;
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
};

/** Respuesta de /auth/yo. */
export type Usuario = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: Rol;
};

export type Oficio =
  | 'ELECTRICIDAD'
  | 'GASFITERIA'
  | 'CERRAJERIA'
  | 'PINTURA'
  | 'LIMPIEZA'
  | 'REPARACIONES'
  | 'INSTALACIONES'
  | 'MANTENCION'
  | 'OTROS';

export type EstadoVerificacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Datos que la app envía para crear/editar el perfil del maestro. */
export type PerfilMaestroData = {
  oficios: Oficio[];
  descripcion: string;
  aniosExperiencia: number;
  tarifaReferencial: number | null;
  zonaCobertura: string;
  latitud: number | null;
  longitud: number | null;
};

/** Perfil del maestro que devuelve el backend. */
export type PerfilMaestroResponse = {
  id: number;
  usuarioId: number;
  oficios: Oficio[];
  descripcion: string | null;
  aniosExperiencia: number;
  tarifaReferencial: number | null;
  zonaCobertura: string | null;
  latitud: number | null;
  longitud: number | null;
  estadoVerificacion: EstadoVerificacion;
};

/** Metadatos de un documento de verificación (el archivo vive en el backend/MinIO). */
export type DocumentoResponse = {
  id: number;
  nombreArchivo: string;
  tipoContenido: string;
  fechaCreacion: string;
};

/** Estados por los que pasa un servicio (máquina de estados del negocio). */
export type EstadoServicio =
  | 'SOLICITADO'
  | 'COTIZADO'
  | 'ACEPTADO'
  | 'EN_CURSO'
  | 'COMPLETADO'
  | 'PAGADO'
  | 'CALIFICADO'
  | 'CANCELADO'
  | 'EN_DISPUTA';

/** Datos para crear una solicitud de servicio. */
export type CrearSolicitudData = {
  maestroId: number;
  oficio: Oficio;
  descripcion: string;
  direccion: string;
  fechaPreferida: string | null;
  presupuestoEstimado: number | null;
};

/** Una solicitud vista desde la app. */
export type Solicitud = {
  id: number;
  clienteId: number;
  clienteNombre: string;
  maestroId: number;
  maestroNombre: string;
  oficio: Oficio;
  descripcion: string;
  direccion: string;
  fechaPreferida: string | null;
  presupuestoEstimado: number | null;
  estado: EstadoServicio;
  motivoCancelacion: string | null;
  cotizacionMonto: number | null;
  cotizacionMensaje: string | null;
  fechaCreacion: string;
};

/** Desglose que ve el cliente antes de pagar. */
export type ResumenPago = {
  solicitudId: number;
  maestroNombre: string;
  montoServicio: number;
  porcentajeComision: number;
  comision: number;
  yaPagado: boolean;
};

/** Comprobante del pago realizado. */
export type Pago = {
  id: number;
  solicitudId: number;
  montoServicio: number;
  porcentajeComision: number;
  comision: number;
  montoMaestro: number;
  metodo: string;
  fechaCreacion: string;
};

/** Panel de ingresos del maestro. */
export type Ingresos = {
  totalAcumulado: number;
  totalMes: number;
  serviciosPagados: number;
  serviciosPorCobrar: number;
  ultimosMeses: { mes: string; monto: number }[];
};

/** Mensaje del chat de una solicitud. */
export type Mensaje = {
  id: number;
  solicitudId: number;
  autorId: number;
  autorNombre: string;
  texto: string;
  leido: boolean;
  fechaCreacion: string;
};

/** Tarjeta de un maestro cercano en la búsqueda. */
export type MaestroCercano = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  oficios: Oficio[];
  zonaCobertura: string | null;
  aniosExperiencia: number;
  tarifaReferencial: number | null;
  distanciaKm: number;
};

/** Perfil público de un maestro (lo que ve un cliente). */
export type MaestroPublico = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  oficios: Oficio[];
  descripcion: string | null;
  aniosExperiencia: number;
  tarifaReferencial: number | null;
  zonaCobertura: string | null;
};

/** Vista que el admin ve de un maestro (para aprobar/rechazar). */
export type MaestroAdmin = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  oficios: Oficio[];
  zonaCobertura: string | null;
  aniosExperiencia: number;
  estadoVerificacion: EstadoVerificacion;
};
