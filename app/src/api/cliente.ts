import { API_URL } from './config';
import { AuthResponse, LoginData, RegistroData, Usuario } from './tipos';

/**
 * Envía una petición al backend y devuelve la respuesta en JSON.
 * Si el backend responde con error, lanza un Error con un mensaje entendible.
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
    // Falla de red o tiempo agotado: el teléfono no alcanzó al backend.
    throw new Error(
      'No se pudo conectar con el servidor. Revisa que el backend esté corriendo y que el teléfono esté en la misma red que tu PC.',
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!res.ok) {
    // Mensajes amigables según el código de estado.
    if (res.status === 409) throw new Error('Ya existe una cuenta con ese correo.');
    if (res.status === 401) throw new Error('Correo o contraseña incorrectos.');
    if (res.status === 400) throw new Error('Revisa los datos ingresados.');
    throw new Error('Ocurrió un error. Inténtalo de nuevo.');
  }

  return res.json() as Promise<T>;
}

export const api = {
  registro: (datos: RegistroData) =>
    pedir<AuthResponse>('/auth/registro', { method: 'POST', body: JSON.stringify(datos) }),
  login: (datos: LoginData) =>
    pedir<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(datos) }),
  yo: (token: string) => pedir<Usuario>('/auth/yo', {}, token),
};
