import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { API_URL } from '../../api/config';
import { useAuth } from '../../estado/AuthContext';
import { colores, fuentes } from '../../tema/tema';

type Props = {
  usuarioId?: number;
  nombre?: string;
  /** Si es false, ni siquiera intentamos pedir la imagen (evita un 404 por avatar). */
  tieneAvatar?: boolean;
  tamano?: number;
};

/**
 * Foto de perfil de un usuario. Si no tiene, muestra sus iniciales.
 * La imagen la sirve el backend, así que va con el token en la cabecera.
 */
export function AvatarUsuario({ usuarioId, nombre = '', tieneAvatar, tamano = 40 }: Props) {
  const { sesion } = useAuth();
  const estiloBase = { width: tamano, height: tamano, borderRadius: tamano / 2 };

  if (tieneAvatar && usuarioId && sesion?.token) {
    return (
      <Image
        source={{
          uri: `${API_URL}/usuarios/${usuarioId}/avatar`,
          headers: { Authorization: `Bearer ${sesion.token}` },
        }}
        style={[estiloBase, styles.imagen]}
      />
    );
  }

  return (
    <View style={[estiloBase, styles.iniciales]}>
      <Text style={[styles.texto, { fontSize: tamano * 0.38 }]}>{iniciales(nombre)}</Text>
    </View>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  imagen: { backgroundColor: colores.neutral[200] },
  iniciales: {
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontFamily: fuentes.bold, color: colores.primario },
});
