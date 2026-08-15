import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { AvatarUsuario } from '../componentes/base/AvatarUsuario';
import { Icono, NombreIcono } from '../componentes/base/Icono';
import { useAuth } from '../estado/AuthContext';
import { colores, espacio, margenPantalla, radio, sombra, texto as t } from '../tema/tema';

type Opcion = {
  icono: NombreIcono;
  titulo: string;
  onPress?: () => void;
  /** Todavía no implementado: se muestra atenuado. */
  proximamente?: boolean;
};

export function PerfilScreen({ navigation }: { navigation: any }) {
  const { sesion, cerrarSesion, refrescar } = useAuth();
  const rol = sesion?.rol;
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  /** Elige una foto de la galería y la sube como avatar. */
  async function cambiarFoto() {
    setError('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesito permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (res.canceled) return;

    const asset = res.assets[0];
    try {
      setSubiendo(true);
      await api.usuarios.subirAvatar(
        sesion?.token ?? '',
        asset.uri,
        asset.fileName ?? 'avatar.jpg',
        asset.mimeType ?? 'image/jpeg',
      );
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  const etiquetaRol =
    rol === 'MAESTRO' ? 'Maestro' : rol === 'ADMIN' ? 'Administrador' : 'Cliente';

  const opciones: Opcion[] = [
    ...(rol === 'MAESTRO'
      ? [{ icono: 'briefcase-outline' as NombreIcono, titulo: 'Mi perfil profesional', onPress: () => navigation.navigate('PerfilMaestro') }]
      : []),
    { icono: 'person-outline', titulo: 'Mis datos', proximamente: true },
    { icono: 'location-outline', titulo: 'Mis direcciones', proximamente: true },
    { icono: 'heart-outline', titulo: 'Mis maestros', onPress: () => navigation.navigate('Favoritos') },
    { icono: 'notifications-outline', titulo: 'Notificaciones', proximamente: true },
    { icono: 'help-circle-outline', titulo: 'Ayuda', proximamente: true },
    { icono: 'document-text-outline', titulo: 'Términos y privacidad', proximamente: true },
  ];

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabecera}>
          <Pressable onPress={cambiarFoto} disabled={subiendo} accessibilityLabel="Cambiar foto de perfil">
            <AvatarUsuario
              usuarioId={sesion?.id}
              nombre={sesion?.nombre}
              tieneAvatar={sesion?.tieneAvatar}
              tamano={88}
            />
            <View style={styles.camara}>
              {subiendo ? (
                <ActivityIndicator size="small" color={colores.blanco} />
              ) : (
                <Icono nombre="camera" tamano="sm" color={colores.blanco} />
              )}
            </View>
          </Pressable>
          <Text style={[t.h2, styles.nombre]}>{sesion?.nombre}</Text>
          <View style={styles.chipRol}>
            <Text style={styles.chipRolTexto}>{etiquetaRol}</Text>
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.tarjeta}>
          {opciones.map((o, i) => (
            <Pressable
              key={o.titulo}
              onPress={o.onPress}
              disabled={o.proximamente}
              style={({ pressed }) => [
                styles.opcion,
                i < opciones.length - 1 && styles.opcionBorde,
                pressed && !o.proximamente && styles.opcionPresionada,
              ]}>
              <Icono
                nombre={o.icono}
                tamano="lg"
                color={o.proximamente ? colores.textoTenue : colores.texto}
              />
              <Text style={[styles.opcionTexto, o.proximamente && styles.atenuado]}>{o.titulo}</Text>
              {o.proximamente ? (
                <Text style={styles.proximamente}>Pronto</Text>
              ) : (
                <Icono nombre="chevron-forward" tamano="md" color={colores.textoTenue} />
              )}
            </Pressable>
          ))}
        </View>

        <Boton titulo="Cerrar sesión" variante="peligro" icono="log-out-outline" onPress={cerrarSesion} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  scroll: { padding: margenPantalla, paddingBottom: espacio.xl },
  cabecera: { alignItems: 'center', marginBottom: espacio.lg },
  nombre: { marginTop: espacio.sm },
  chipRol: {
    marginTop: espacio.xs,
    backgroundColor: colores.primarioSuave,
    paddingHorizontal: espacio.sm,
    paddingVertical: 4,
    borderRadius: radio.completo,
  },
  chipRolTexto: { ...t.etiqueta, color: colores.primario, fontWeight: '700' },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    marginBottom: espacio.lg,
    ...sombra.nivel1,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.md,
  },
  opcionBorde: { borderBottomWidth: 1, borderBottomColor: colores.borde },
  opcionPresionada: { backgroundColor: colores.neutral[50] },
  opcionTexto: { ...t.cuerpo, flex: 1 },
  atenuado: { color: colores.textoTenue },
  proximamente: { ...t.etiqueta, color: colores.textoTenue },
  camara: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: radio.completo,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.fondo,
  },
  error: { ...t.pequeno, color: colores.error, textAlign: 'center', marginBottom: espacio.sm },
});
