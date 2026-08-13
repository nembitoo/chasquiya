import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '../componentes/Boton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Inicio'>;

export function InicioScreen({ navigation }: Props) {
  const { sesion, cerrarSesion } = useAuth();
  const rol = sesion?.rol;

  const etiquetaRol =
    rol === 'MAESTRO' ? 'Cuenta de Maestro' : rol === 'ADMIN' ? 'Administrador' : 'Cuenta de Cliente';

  const nota =
    rol === 'MAESTRO'
      ? 'Completa tu perfil profesional para que un administrador te apruebe y aparezcas ante los clientes.'
      : rol === 'ADMIN'
        ? 'Revisa y aprueba los maestros que se registran en la plataforma.'
        : 'Las pantallas principales (búsqueda, mapa, solicitudes…) llegan en los próximos hitos.';

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.centro}>
        <Text style={styles.saludo}>Hola, {sesion?.nombre} 👋</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{etiquetaRol}</Text>
        </View>
        <Text style={styles.nota}>{nota}</Text>
      </View>

      <View>
        {rol === 'MAESTRO' && (
          <>
            <Boton titulo="Mi perfil profesional" onPress={() => navigation.navigate('PerfilMaestro')} />
            <View style={{ height: espacio.sm }} />
          </>
        )}
        {rol === 'ADMIN' && (
          <>
            <Boton titulo="Revisar maestros pendientes" onPress={() => navigation.navigate('Admin')} />
            <View style={{ height: espacio.sm }} />
          </>
        )}
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={cerrarSesion} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, padding: espacio.lg, justifyContent: 'space-between' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saludo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  badge: {
    marginTop: espacio.md,
    backgroundColor: colores.primarioSuave,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
    borderRadius: radio.completo,
  },
  badgeTexto: { color: colores.primario, fontWeight: '700' },
  nota: {
    marginTop: espacio.lg,
    fontSize: tipografia.cuerpo,
    color: colores.textoSuave,
    textAlign: 'center',
    paddingHorizontal: espacio.md,
  },
});
