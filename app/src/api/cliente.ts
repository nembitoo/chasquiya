import { API_URL } from './config';
import {
  ActualizarPerfilData,
  AuthResponse,
  Calificacion,
  CalificarData,
  CrearSolicitudData,
  Direccion,
  DireccionData,
  DocumentoResponse,
  FiltrosBusqueda,
  Ingresos,
  LoginData,
  MaestroAdmin,
  MaestroCercano,
  MaestroPublico,
  Mensaje,
  Oficio,
  Pago,
  PerfilMaestroData,
  PerfilMaestroResponse,
  RegistroData,
  Reputacion,
  ResumenPago,
  Solicitud,
  Usuario,
} from './tipos';

/** Error de la API que conserva el código de estado HTTP. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Envía una petición al backend y devuelve la respuesta en JSON.
 * Lanza ApiError (con status) si algo falla, con un mensaje entendible.
 */
async function pedir<T>(ruta: string, opciones: RequestInit = {}, token?: string): Promise<T> {
  // Cortamos la espera a los 10s para no quedar "cargando" para siempre.
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 10000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      signal: controlador.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opciones.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa que el backend esté corriendo y que el teléfono esté en la misma red que tu PC.',
      0,
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!res.ok) {
    // Preferimos el motivo que envía el backend ("Ya calificaste este servicio", etc.).
    // Puede venir como "detail" (ProblemDetail, RFC 9457) o "message" según la versión.
    let mensaje = '';
    try {
      const cuerpo = await res.clone().json();
      const motivo = cuerpo?.detail ?? cuerpo?.message;
      if (typeof motivo === 'string' && motivo.trim()) {
        mensaje = motivo;
      }
    } catch {
      // Sin cuerpo JSON: usamos un mensaje según el código.
    }
    if (!mensaje) {
      if (res.status === 409) mensaje = 'Esta acción ya no es posible.';
      else if (res.status === 401) mensaje = 'Correo o contraseña incorrectos.';
      else if (res.status === 403) mensaje = 'No tienes permiso para esta acción.';
      else if (res.status === 400) mensaje = 'Revisa los datos ingresados.';
      else mensaje = 'Ocurrió un error. Inténtalo de nuevo.';
    }
    throw new ApiError(mensaje, res.status);
  }

  const texto = await res.text();
  return (texto ? JSON.parse(texto) : null) as T;
}

/** Sube un archivo (multipart). NO fija Content-Type: React Native pone el boundary. */
async function subirArchivo<T>(
  ruta: string,
  token: string,
  uri: string,
  nombre: string,
  tipo: string,
): Promise<T> {
  const form = new FormData();
  // En React Native, un archivo se adjunta como { uri, name, type }.
  form.append('archivo', { uri, name: nombre, type: tipo } as unknown as Blob);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: 'POST',
      signal: controlador.signal,
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('No se pudo subir el archivo. Revisa tu conexión.', 0);
  } finally {
    clearTimeout(temporizador);
  }
  if (!res.ok) {
    throw new ApiError('No se pudo subir el archivo.', res.status);
  }
  const texto = await res.text();
  return (texto ? JSON.parse(texto) : null) as T;
}

export const api = {
  registro: (datos: RegistroData) =>
    pedir<AuthResponse>('/auth/registro', { method: 'POST', body: JSON.stringify(datos) }),
  login: (datos: LoginData) =>
    pedir<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(datos) }),
  yo: (token: string) => pedir<Usuario>('/auth/yo', {}, token),

  perfilMaestro: {
    /** Devuelve el perfil, o null si el maestro aún no lo ha creado (404). */
    obtener: async (token: string): Promise<PerfilMaestroResponse | null> => {
      try {
        return await pedir<PerfilMaestroResponse>('/maestros/mi-perfil', {}, token);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    guardar: (token: string, datos: PerfilMaestroData) =>
      pedir<PerfilMaestroResponse>(
        '/maestros/mi-perfil',
        { method: 'PUT', body: JSON.stringify(datos) },
        token,
      ),
  },

  admin: {
    pendientes: (token: string) => pedir<MaestroAdmin[]>('/admin/maestros/pendientes', {}, token),
    aprobar: (token: string, usuarioId: number) =>
      pedir<PerfilMaestroResponse>(`/admin/maestros/${usuarioId}/aprobar`, { method: 'POST' }, token),
    rechazar: (token: string, usuarioId: number) =>
      pedir<PerfilMaestroResponse>(`/admin/maestros/${usuarioId}/rechazar`, { method: 'POST' }, token),
    documentosDe: (token: string, usuarioId: number) =>
      pedir<DocumentoResponse[]>(`/admin/maestros/${usuarioId}/documentos`, {}, token),
  },

  descubrimiento: {
    buscar: (token: string, lat: number, lon: number, filtros: FiltrosBusqueda = {}) => {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (filtros.oficio) params.append('oficio', filtros.oficio);
      if (filtros.radioKm) params.append('radioKm', String(filtros.radioKm));
      if (filtros.precioMaximo) params.append('precioMaximo', String(filtros.precioMaximo));
      if (filtros.calificacionMinima) params.append('calificacionMinima', String(filtros.calificacionMinima));
      if (filtros.orden) params.append('orden', filtros.orden);
      return pedir<MaestroCercano[]>(`/descubrimiento/maestros?${params.toString()}`, {}, token);
    },
    maestro: (token: string, usuarioId: number) =>
      pedir<MaestroPublico>(`/descubrimiento/maestros/${usuarioId}`, {}, token),
  },

  solicitudes: {
    // Cliente
    crear: (token: string, datos: CrearSolicitudData) =>
      pedir<Solicitud>('/solicitudes', { method: 'POST', body: JSON.stringify(datos) }, token),
    mias: (token: string) => pedir<Solicitud[]>('/solicitudes/mias', {}, token),
    aceptar: (token: string, id: number) =>
      pedir<Solicitud>(`/solicitudes/${id}/aceptar`, { method: 'POST' }, token),
    rechazar: (token: string, id: number) =>
      pedir<Solicitud>(`/solicitudes/${id}/rechazar`, { method: 'POST' }, token),
    // Maestro
    recibidas: (token: string) => pedir<Solicitud[]>('/solicitudes/recibidas', {}, token),
    cotizar: (token: string, id: number, monto: number, mensaje: string) =>
      pedir<Solicitud>(
        `/solicitudes/${id}/cotizar`,
        { method: 'POST', body: JSON.stringify({ monto, mensaje }) },
        token,
      ),
    iniciar: (token: string, id: number) =>
      pedir<Solicitud>(`/solicitudes/${id}/iniciar`, { method: 'POST' }, token),
    completar: (token: string, id: number) =>
      pedir<Solicitud>(`/solicitudes/${id}/completar`, { method: 'POST' }, token),
    // Ambas partes
    cancelar: (token: string, id: number, motivo: string) =>
      pedir<Solicitud>(
        `/solicitudes/${id}/cancelar`,
        { method: 'POST', body: JSON.stringify({ motivo }) },
        token,
      ),
  },

  usuarios: {
    /** Sube la foto de perfil del usuario autenticado. */
    subirAvatar: (token: string, uri: string, nombre: string, tipo: string) =>
      subirArchivo<{ tieneAvatar: boolean }>('/usuarios/mi-avatar', token, uri, nombre, tipo),
    actualizarPerfil: (token: string, datos: ActualizarPerfilData) =>
      pedir<Usuario>('/auth/yo', { method: 'PUT', body: JSON.stringify(datos) }, token),
  },

  direcciones: {
    mias: (token: string) => pedir<Direccion[]>('/mis-direcciones', {}, token),
    crear: (token: string, datos: DireccionData) =>
      pedir<Direccion>('/mis-direcciones', { method: 'POST', body: JSON.stringify(datos) }, token),
    actualizar: (token: string, id: number, datos: DireccionData) =>
      pedir<Direccion>(`/mis-direcciones/${id}`, { method: 'PUT', body: JSON.stringify(datos) }, token),
    eliminar: (token: string, id: number) =>
      pedir<null>(`/mis-direcciones/${id}`, { method: 'DELETE' }, token),
  },

  favoritos: {
    mios: (token: string) => pedir<MaestroCercano[]>('/favoritos', {}, token),
    /** Guarda o quita el maestro; devuelve si quedó guardado. */
    alternar: (token: string, maestroId: number) =>
      pedir<{ esFavorito: boolean }>(`/favoritos/${maestroId}`, { method: 'POST' }, token),
  },

  calificaciones: {
    calificar: (token: string, solicitudId: number, datos: CalificarData) =>
      pedir<Calificacion>(
        `/solicitudes/${solicitudId}/calificacion`,
        { method: 'POST', body: JSON.stringify(datos) },
        token,
      ),
    resenasDe: (token: string, usuarioId: number) =>
      pedir<Calificacion[]>(`/usuarios/${usuarioId}/resenas`, {}, token),
    reputacionDe: (token: string, usuarioId: number) =>
      pedir<Reputacion>(`/usuarios/${usuarioId}/reputacion`, {}, token),
  },

  disputas: {
    /** Cualquiera de las dos partes puede reportar un problema. */
    abrir: (token: string, solicitudId: number, motivo: string) =>
      pedir<Solicitud>(
        `/solicitudes/${solicitudId}/disputa`,
        { method: 'POST', body: JSON.stringify({ motivo }) },
        token,
      ),
    // Admin
    abiertas: (token: string) => pedir<Solicitud[]>('/admin/disputas', {}, token),
    resolver: (token: string, solicitudId: number, aFavorDelCliente: boolean, resolucion: string) =>
      pedir<Solicitud>(
        `/admin/disputas/${solicitudId}/resolver`,
        { method: 'POST', body: JSON.stringify({ aFavorDelCliente, resolucion }) },
        token,
      ),
  },

  pagos: {
    /** Desglose antes de pagar. */
    resumen: (token: string, solicitudId: number) =>
      pedir<ResumenPago>(`/solicitudes/${solicitudId}/pago`, {}, token),
    /** Pago simulado: no se envía ningún dato de medio de pago. */
    pagar: (token: string, solicitudId: number) =>
      pedir<Pago>(`/solicitudes/${solicitudId}/pago`, { method: 'POST' }, token),
    misIngresos: (token: string) => pedir<Ingresos>('/maestros/mis-ingresos', {}, token),
  },

  mensajes: {
    listar: (token: string, solicitudId: number) =>
      pedir<Mensaje[]>(`/solicitudes/${solicitudId}/mensajes`, {}, token),
    enviar: (token: string, solicitudId: number, texto: string) =>
      pedir<Mensaje>(
        `/solicitudes/${solicitudId}/mensajes`,
        { method: 'POST', body: JSON.stringify({ texto }) },
        token,
      ),
    marcarLeidos: (token: string, solicitudId: number) =>
      pedir<null>(`/solicitudes/${solicitudId}/mensajes/leidos`, { method: 'POST' }, token),
    /** { solicitudId: cantidad } para los badges de las listas. */
    noLeidos: (token: string) => pedir<Record<string, number>>('/mensajes/no-leidos', {}, token),
  },

  documentos: {
    mios: (token: string) => pedir<DocumentoResponse[]>('/maestros/mi-perfil/documentos', {}, token),
    subir: (token: string, uri: string, nombre: string, tipo: string) =>
      subirArchivo<DocumentoResponse>('/maestros/mi-perfil/documentos', token, uri, nombre, tipo),
    // URLs para mostrar la imagen (con encabezado Authorization en el <Image>).
    urlMio: (id: number) => `${API_URL}/maestros/mi-perfil/documentos/${id}/contenido`,
    urlAdmin: (usuarioId: number, id: number) =>
      `${API_URL}/admin/maestros/${usuarioId}/documentos/${id}/contenido`,
  },
};
