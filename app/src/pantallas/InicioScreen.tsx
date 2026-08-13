import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '../componentes/Boton';
import { useAuth } from '../estado/AuthContext';
import { colores, espacio, radio, tipografia } from '../tema/tema';

export function InicioScreen() {
  const { sesion, cerrarSesion } = useAuth();
  const esMaestro = sesion?.rol === 'MAESTRO';

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.centro}>
        <Text style={styles.saludo}>Hola, {sesion?.nombre} 👋</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{esMaestro ? 'Cuenta de Maestro' : 'Cuenta de Cliente'}</Text>
        </View>
        <Text style={styles.nota}>
          Tu sesión está iniciada. Las pantallas principales (búsqueda, mapa, solicitudes…) llegan en los
          próximos hitos.
        </Text>
      </View>
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={cerrarSesion} />
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
