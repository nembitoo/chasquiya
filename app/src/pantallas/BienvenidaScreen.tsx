import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '../componentes/Boton';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Bienvenida'>;

export function BienvenidaScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.centro}>
        <Text style={styles.logo}>🏃 ChasquiYa!</Text>
        <Text style={styles.tagline}>Encuentra al maestro que necesitas, cerca de ti.</Text>
      </View>
      <View style={styles.botones}>
        <Boton titulo="Crear cuenta" onPress={() => navigation.navigate('Registro')} />
        <View style={{ height: espacio.sm }} />
        <Boton titulo="Iniciar sesión" variante="secundario" onPress={() => navigation.navigate('Login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espacio.lg,
    justifyContent: 'space-between',
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colores.primario,
  },
  tagline: {
    fontSize: tipografia.subtitulo,
    color: colores.textoSuave,
    textAlign: 'center',
    marginTop: espacio.md,
    paddingHorizontal: espacio.md,
  },
  botones: {
    paddingBottom: espacio.md,
  },
});
