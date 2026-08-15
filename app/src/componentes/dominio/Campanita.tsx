import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import { useAuth } from '../../estado/AuthContext';
import { RootStackParamList } from '../../navegacion/Navegacion';
import { colores, espacio, radio, texto as t } from '../../tema/tema';
import { Icono } from '../base/Icono';

/**
 * Campanita con el contador de avisos sin leer.
 * Se refresca al volver a la pantalla: sin WebSocket ni polling en segundo plano,
 * que para esto no se justifica y gastaría batería.
 */
export function Campanita() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const [noLeidas, setNoLeidas] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      api.notificaciones
        .bandeja(token)
        .then((b) => {
          if (vigente) setNoLeidas(b.noLeidas);
        })
        // Un fallo aquí no debe molestar: la campanita simplemente no muestra número.
        .catch(() => undefined);
      return () => {
        vigente = false;
      };
    }, [token]),
  );

  return (
    <Pressable
      onPress={() => navigation.navigate('Notificaciones')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'
      }
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}>
      <Icono nombre="notifications-outline" tamano="lg" color={colores.texto} />
      {noLeidas > 0 && (
        <View style={styles.globo}>
          <Text style={styles.globoTexto}>{noLeidas > 9 ? '9+' : noLeidas}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 44,
    height: 44,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.6 },
  globo: {
    position: 'absolute',
    top: espacio.xs,
    right: espacio.xs,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colores.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoTexto: { ...t.etiqueta, color: colores.superficie, fontSize: 10, lineHeight: 14 },
});
