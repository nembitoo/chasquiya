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
  tieneAvatar: boolean;
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
  // Los precios NO viven aquí: van en el catálogo, cada uno con su servicio.
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
  /** El maestro propuso otro precio y el trabajo espera la decisión del cliente. */
  | 'AJUSTE_PROPUESTO'
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
  /** Servicio del catálogo que se está pidiendo, si el cliente eligió uno. */
  servicioId?: number | null;
};

/**
 * Un servicio con precio publicado por un maestro.
 *
 * Los precios los pone él, no la plataforma: fijar tarifas sería tratarlo como
 * empleado, y es independiente (Ley 21.431).
 */
export type ServicioCatalogo = {
  id: number;
  maestroId: number;
  oficio: Oficio;
  titulo: string;
  descripcion: string | null;
  precio: number;
  /** true = se compromete a ese monto y la cotización sale sola; false = es un "desde". */
  precioFijo: boolean;
  /** "por punto", "la hora"... Cada oficio se mide distinto. */
  unidad: string | null;
  activo: boolean;
};

/** Lo que el maestro envía para publicar o corregir un servicio suyo. */
export type ServicioCatalogoData = {
  oficio: Oficio;
  titulo: string;
  descripcion: string | null;
  precio: number;
  precioFijo: boolean;
  unidad: string | null;
};

/** Una solicitud vista desde la app. */
export type Solicitud = {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteTieneAvatar: boolean;
  maestroId: number;
  maestroNombre: string;
  maestroTieneAvatar: boolean;
  oficio: Oficio;
  descripcion: string;
  direccion: string;
  fechaPreferida: string | null;
  presupuestoEstimado: number | null;
  estado: EstadoServicio;
  motivoCancelacion: string | null;
  resolucionDisputa: string | null;
  cotizacionMonto: number | null;
  cotizacionMensaje: string | null;
  /** Si yo ya dejé mi calificación en este servicio. */
  yaCalifique: boolean;
  /** Fotos del problema adjuntas; el contenido se pide aparte. */
  cantidadFotos: number;
  /** Publicada sin maestro: varios pueden cotizarla y el cliente elige. */
  abierta: boolean;
  /** Cuántas ofertas recibió. En una abierta es lo que el cliente compara. */
  cantidadCotizaciones: number;
  /** CERRADO o ESTIMADO: define si el precio todavía puede cambiar. */
  cotizacionTipo: TipoCotizacion | null;
  cotizacionCostoVisita: number | null;
  /** Precio nuevo esperando que el cliente lo apruebe, si lo hay. */
  montoAjustado: number | null;
  mensajeAjuste: string | null;
  /** Si el trabajo no se hizo, lo único cobrable: la visita ya acordada. */
  montoVisitaCobrado: number | null;
  /**
   * Precio que el maestro tiene publicado hoy para el servicio del que nació
   * esta solicitud. Solo para precargarle el monto al cotizar.
   */
  precioCatalogo: number | null;
  fechaCreacion: string;
};

/** Calificación que se envía al terminar el servicio. */
export type CalificarData = {
  estrellas: number;
  comentario: string | null;
  puntualidad: number | null;
  calidad: number | null;
  trato: number | null;
};

/** Reseña recibida por un usuario. */
export type Calificacion = {
  id: number;
  solicitudId: number;
  autorId: number;
  autorNombre: string;
  estrellas: number;
  comentario: string | null;
  puntualidad: number | null;
  calidad: number | null;
  trato: number | null;
  fechaCreacion: string;
};

/** Reputación: promedio y cantidad de calificaciones. */
export type Reputacion = { promedio: number; cantidad: number };

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
  /**
   * Precio del catálogo para el oficio que se está buscando; sin filtro, el más
   * bajo que tenga publicado. Null solo en listas sin contexto (favoritos).
   */
  precio: number | null;
  /** Si ese precio es firme o es un "desde". */
  precioFijo: boolean;
  /** Qué servicio es ese precio: el número solo, sin contexto, engaña. */
  precioServicio: string | null;
  distanciaKm: number;
  calificacionPromedio: number;
  cantidadCalificaciones: number;
  esFavorito: boolean;
  tieneAvatar: boolean;
  /** Trabajos que ya terminó: señal de confianza más concreta que las estrellas. */
  trabajosCompletados: number;
  /** Posición APROXIMADA (~500 m) para el mapa. Nunca es la coordenada exacta. */
  latitudAprox: number | null;
  longitudAprox: number | null;
};

/** Dirección guardada del usuario. */
export type Direccion = {
  id: number;
  etiqueta: string;
  direccion: string;
  comuna: string | null;
  referencia: string | null;
  esPrincipal: boolean;
};

/** Datos para crear o editar una dirección. */
export type DireccionData = {
  etiqueta: string;
  direccion: string;
  comuna: string | null;
  referencia: string | null;
  esPrincipal: boolean;
};

/** Datos editables de la cuenta. */
export type ActualizarPerfilData = {
  nombre: string;
  apellido: string;
  telefono: string;
};

/** Filtros opcionales de la búsqueda de maestros. */
export type FiltrosBusqueda = {
  oficio?: Oficio;
  radioKm?: number;
  precioMaximo?: number;
  calificacionMinima?: number;
  orden?: 'distancia' | 'calificacion' | 'precio';
};

/** Perfil público de un maestro (lo que ve un cliente). */
export type MaestroPublico = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  oficios: Oficio[];
  descripcion: string | null;
  aniosExperiencia: number;
  // Sin precio general: se piden aparte con api.catalogo.deMaestro().
  zonaCobertura: string | null;
  calificacionPromedio: number;
  cantidadCalificaciones: number;
  esFavorito: boolean;
  tieneAvatar: boolean;
  /** Trabajos que ya terminó: señal de confianza más concreta que las estrellas. */
  trabajosCompletados: number;
};

export type CategoriaTicket = 'PAGO' | 'SERVICIO' | 'CUENTA' | 'DENUNCIA' | 'SUGERENCIA' | 'OTRO';
export type EstadoTicket = 'NUEVO' | 'EN_REVISION' | 'RESUELTO';

/** Reclamo de soporte. Complementa a las disputas, que son de un servicio puntual. */
export type Ticket = {
  id: number;
  categoria: CategoriaTicket;
  asunto: string;
  mensaje: string;
  estado: EstadoTicket;
  respuesta: string | null;
  solicitudId: number | null;
  /**
   * De qué servicio habla el reclamo. Lo resuelve el backend a partir de
   * solicitudId; queda null si no eligió ninguno o si el servicio ya no existe.
   */
  servicioOficio: Oficio | null;
  servicioDescripcion: string | null;
  servicioEstado: EstadoServicio | null;
  servicioMaestro: string | null;
  servicioFecha: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
};

export type CrearTicketData = {
  categoria: CategoriaTicket;
  asunto: string;
  mensaje: string;
  solicitudId?: number | null;
};

/**
 * Qué tan firme es el precio.
 * CERRADO no cambia; ESTIMADO puede ajustarse tras ver el trabajo.
 */
export type TipoCotizacion = 'CERRADO' | 'ESTIMADO';

/** Una oferta recibida, con los datos del maestro que la hizo. */
export type Cotizacion = {
  id: number;
  maestroId: number;
  maestroNombre: string;
  maestroTieneAvatar: boolean;
  monto: number;
  tipo: TipoCotizacion;
  /** Lo que cobra por ir a diagnosticar si el trabajo no se hace. */
  costoVisita: number | null;
  mensaje: string | null;
  calificacionPromedio: number;
  cantidadCalificaciones: number;
  trabajosCompletados: number;
  aniosExperiencia: number;
  fechaCreacion: string;
};

/** Trabajo publicado sin elegir maestro. */
export type PublicarSolicitudData = {
  oficio: Oficio;
  descripcion: string;
  direccion: string;
  fechaPreferida?: string | null;
  presupuestoEstimado?: number | null;
  latitud?: number | null;
  longitud?: number | null;
};

/** Foto del problema adjunta a una solicitud (solo el id; el contenido va aparte). */
export type FotoSolicitud = { id: number };

/** Motivo del aviso: decide el icono y a dónde lleva al tocarlo. */
export type TipoNotificacion =
  | 'SOLICITUD_NUEVA'
  | 'COTIZACION_RECIBIDA'
  | 'COTIZACION_ACEPTADA'
  | 'COTIZACION_RECHAZADA'
  | 'AJUSTE_PROPUESTO'
  | 'AJUSTE_APROBADO'
  | 'AJUSTE_RECHAZADO'
  | 'TRABAJO_INICIADO'
  | 'TRABAJO_COMPLETADO'
  | 'PAGO_RECIBIDO'
  | 'CALIFICACION_RECIBIDA'
  | 'SERVICIO_CANCELADO'
  | 'VERIFICACION_APROBADA'
  | 'VERIFICACION_RECHAZADA';

export type Notificacion = {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  solicitudId: number | null;
  leida: boolean;
  fechaCreacion: string;
};

/** Lo que necesita la campanita: historial + cuántas faltan por leer. */
export type Bandeja = {
  notificaciones: Notificacion[];
  noLeidas: number;
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
