import { API_URL } from './config';
import {
  AuthResponse,
  CrearSolicitudData,
  DocumentoResponse,
  LoginData,
  MaestroAdmin,
  MaestroCercano,
  MaestroPublico,
  Oficio,
  PerfilMaestroData,
  PerfilMaestroResponse,
  RegistroData,
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
    let mensaje = 'Ocurrió un error. Inténtalo de nuevo.';
    if (res.status === 409) mensaje = 'Ya existe una cuenta con ese correo.';
    else if (res.status === 401) mensaje = 'Correo o contraseña incorrectos.';
    else if (res.status === 403) mensaje = 'No tienes permiso para esta acción.';
    else if (res.status === 400) mensaje = 'Revisa los datos ingresados.';
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
    buscar: (token: string, lat: number, lon: number, oficio?: Oficio, radioKm?: number) => {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (oficio) params.append('oficio', oficio);
      if (radioKm) params.append('radioKm', String(radioKm));
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
