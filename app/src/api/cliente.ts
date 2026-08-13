import { API_URL } from './config';
import {
  AuthResponse,
  LoginData,
  MaestroAdmin,
  PerfilMaestroData,
  PerfilMaestroResponse,
  RegistroData,
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
  },
};
