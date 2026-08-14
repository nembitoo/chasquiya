import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { MaestroPublico } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'MaestroPublico'>;

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function MaestroPublicoScreen({ route, navigation }: Props) {
  const { usuarioId } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [maestro, setMaestro] = useState<MaestroPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setMaestro(await api.descubrimiento.maestro(token, usuarioId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el maestro.');
      } finally {
        setCargando(false);
      }
    })();
  }, [token, usuarioId]);

  if (cargando) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.centro]}>
        <ActivityIndicator size="large" color={colores.primario} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
      </View>

      {error || !maestro ? (
        <Text style={styles.error}>{error || 'Maestro no disponible.'}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.nombre}>
            {maestro.nombre} {maestro.apellido}
          </Text>
          <Text style={styles.oficios}>
            {maestro.oficios.map((o) => ETIQUETA_OFICIO[o] ?? o).join('  ')}
          </Text>

          <View style={styles.filaDatos}>
            <Dato etiqueta="Experiencia" valor={`${maestro.aniosExperiencia} años`} />
            <Dato etiqueta="Zona" valor={maestro.zonaCobertura ?? '—'} />
            <Dato
              etiqueta="Tarifa ref."
              valor={maestro.tarifaReferencial ? `$${maestro.tarifaReferencial}` : '—'}
            />
          </View>

          {!!maestro.descripcion && (
            <>
              <Text style={styles.seccion}>Sobre mí</Text>
              <Text style={styles.descripcion}>{maestro.descripcion}</Text>
            </>
          )}

          {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

          <View style={styles.acciones}>
            <Boton
              titulo="Solicitar servicio"
              onPress={() =>
                navigation.navigate('NuevaSolicitud', {
                  maestroId: maestro.usuarioId,
                  maestroNombre: `${maestro.nombre} ${maestro.apellido}`,
                  oficios: maestro.oficios,
                })
              }
            />
            <View style={{ height: espacio.sm }} />
            <Boton
              titulo="Enviar mensaje"
              variante="secundario"
              onPress={() => setAviso('El chat llega en un hito más adelante. 💬')}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600' },
  scroll: { padding: espacio.lg },
  nombre: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  oficios: { color: colores.primario, fontWeight: '600', fontSize: tipografia.cuerpo, marginTop: espacio.xs },
  filaDatos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacio.lg,
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
  },
  dato: { alignItems: 'center', flex: 1 },
  datoEtiqueta: { color: colores.textoSuave, fontSize: tipografia.pequeno },
  datoValor: { color: colores.texto, fontWeight: '700', marginTop: espacio.xs },
  seccion: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto, marginTop: espacio.lg },
  descripcion: { color: colores.texto, marginTop: espacio.sm, lineHeight: 22 },
  aviso: { color: colores.textoSuave, marginTop: espacio.lg, fontStyle: 'italic' },
  acciones: { marginTop: espacio.xl },
  error: { color: colores.error, padding: espacio.lg, fontSize: tipografia.cuerpo },
});
