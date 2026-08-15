import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { api } from '../api/cliente';
import { AuthResponse, LoginData, RegistroData, Rol } from '../api/tipos';

const CLAVE_TOKEN = 'chasquiya_token';

type Sesion = {
  token: string;
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  /** Si el usuario tiene foto de perfil subida. */
  tieneAvatar: boolean;
};

type AuthContextTipo = {
  sesion: Sesion | null;
  cargando: boolean;
  registrar: (datos: RegistroData) => Promise<void>;
  iniciarSesion: (datos: LoginData) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  /** Vuelve a leer los datos del usuario (por ejemplo, tras cambiar la foto). */
  refrescar: () => Promise<void>;
};

const AuthContext = createContext<AuthContextTipo | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app, intenta recuperar una sesión guardada previamente.
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
        if (token) {
          const u = await api.yo(token);
          setSesion({
            token, id: u.id, nombre: u.nombre, email: u.email, rol: u.rol,
            tieneAvatar: u.tieneAvatar,
          });
        }
      } catch {
        // Token inválido o sin conexión: borramos y seguimos sin sesión.
        await SecureStore.deleteItemAsync(CLAVE_TOKEN);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function guardarSesion(resp: AuthResponse) {
    await SecureStore.setItemAsync(CLAVE_TOKEN, resp.token);
    // El login no devuelve la foto: la consultamos aparte (sin bloquear si falla).
    let tieneAvatar = false;
    try {
      tieneAvatar = (await api.yo(resp.token)).tieneAvatar;
    } catch {
      /* sin conexión: se resolverá al refrescar */
    }
    setSesion({
      token: resp.token, id: resp.id, nombre: resp.nombre, email: resp.email,
      rol: resp.rol, tieneAvatar,
    });
  }

  const registrar = async (datos: RegistroData) => guardarSesion(await api.registro(datos));
  const iniciarSesion = async (datos: LoginData) => guardarSesion(await api.login(datos));
  /** Relee los datos del usuario manteniendo el token actual. */
  const refrescar = async () => {
    if (!sesion) return;
    try {
      const u = await api.yo(sesion.token);
      setSesion({ ...sesion, nombre: u.nombre, email: u.email, tieneAvatar: u.tieneAvatar });
    } catch {
      /* si falla, dejamos la sesión como está */
    }
  };

  const cerrarSesion = async () => {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
    setSesion(null);
  };

  return (
    <AuthContext.Provider value={{ sesion, cargando, registrar, iniciarSesion, cerrarSesion, refrescar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
