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
