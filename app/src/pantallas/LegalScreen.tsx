import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icono } from '../componentes/base/Icono';
import { Segmentos } from '../componentes/base/Segmentos';
import { PRIVACIDAD, TERMINOS, VERSION_LEGAL } from '../datos/textosLegales';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;
type Vista = 'terminos' | 'privacidad';

/** Términos y condiciones y política de privacidad. */
export function LegalScreen({ route, navigation }: Props) {
  const [vista, setVista] = useState<Vista>(route.params?.inicial ?? 'terminos');

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Legal</Text>
        <View style={styles.segmentos}>
          <Segmentos<Vista>
            valor={vista}
            onCambio={setVista}
            opciones={[
              { valor: 'terminos', etiqueta: 'Términos' },
              { valor: 'privacidad', etiqueta: 'Privacidad' },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.version}>Versión {VERSION_LEGAL}</Text>
        <Text style={styles.cuerpo}>{vista === 'terminos' ? TERMINOS : PRIVACIDAD}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  segmentos: { marginTop: espacio.sm },
  scroll: { padding: margenPantalla },
  version: { ...t.etiqueta, marginBottom: espacio.sm },
  cuerpo: { ...t.cuerpo, lineHeight: 23 },
});
