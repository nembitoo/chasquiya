// Tipos que reflejan los datos que intercambiamos con el backend.

export type Rol = 'CLIENTE' | 'MAESTRO';

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
