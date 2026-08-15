import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { DocumentoResponse, MaestroAdmin } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = TabProps<'Admin'>;

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function AdminMaestrosScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [maestros, setMaestros] = useState<MaestroAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    setCargando(true);
    try {
      setMaestros(await api.admin.pendientes(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function decidir(usuarioId: number, aprobar: boolean) {
    setError('');
    setProcesando(usuarioId);
    try {
      if (aprobar) {
        await api.admin.aprobar(token, usuarioId);
      } else {
        await api.admin.rechazar(token, usuarioId);
      }
      setMaestros((prev) => prev.filter((m) => m.usuarioId !== usuarioId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar.');
    } finally {
      setProcesando(null);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Maestros pendientes</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {maestros.length === 0 && !error ? (
            <Text style={styles.vacio}>No hay maestros pendientes 🎉</Text>
          ) : (
            maestros.map((m) => (
              <View key={m.usuarioId} style={styles.card}>
                <Text style={styles.nombre}>
                  {m.nombre} {m.apellido}
                </Text>
                <Text style={styles.dato}>{m.email}</Text>
                <Text style={styles.oficios}>
                  {m.oficios.map((o) => ETIQUETA_OFICIO[o] ?? o).join('  ')}
                </Text>
                <Text style={styles.dato}>
                  {(m.zonaCobertura ?? 'Sin comuna') + ' · ' + m.aniosExperiencia + ' años exp.'}
                </Text>
                <DocumentosMaestro usuarioId={m.usuarioId} token={token} />
                <View style={styles.acciones}>
                  <View style={{ flex: 1 }}>
                    <Boton
                      titulo="Aprobar"
                      onPress={() => decidir(m.usuarioId, true)}
                      cargando={procesando === m.usuarioId}
                    />
                  </View>
                  <View style={{ width: espacio.sm }} />
                  <View style={{ flex: 1 }}>
                    <Boton
                      titulo="Rechazar"
                      variante="secundario"
                      onPress={() => decidir(m.usuarioId, false)}
                      deshabilitado={procesando === m.usuarioId}
                    />
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={{ height: espacio.md }} />
          <Boton titulo="Actualizar" variante="secundario" onPress={cargar} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Miniaturas de los documentos de un maestro (se cargan bajo demanda por tarjeta). */
function DocumentosMaestro({ usuarioId, token }: { usuarioId: number; token: string }) {
  const [docs, setDocs] = useState<DocumentoResponse[]>([]);

  useEffect(() => {
    let activo = true;
    api.admin
      .documentosDe(token, usuarioId)
      .then((d) => {
        if (activo) setDocs(d);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [usuarioId, token]);

  if (docs.length === 0) {
    return <Text style={styles.sinDocs}>Sin documentos adjuntos</Text>;
  }
  return (
    <View style={styles.docsRow}>
      {docs.map((d) => (
        <Image
          key={d.id}
          source={{
            uri: api.documentos.urlAdmin(usuarioId, d.id),
            headers: { Authorization: `Bearer ${token}` },
          }}
          style={styles.thumbAdmin}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  thumbAdmin: { width: 64, height: 64, borderRadius: radio.sm, backgroundColor: colores.borde },
  sinDocs: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: espacio.sm, fontStyle: 'italic' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm, paddingBottom: espacio.sm },
  volver: {
    color: colores.primario,
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
    marginBottom: espacio.xs,
  },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  scroll: { paddingHorizontal: espacio.lg, paddingBottom: espacio.xl },
  vacio: {
    textAlign: 'center',
    color: colores.textoSuave,
    fontSize: tipografia.cuerpo,
    marginTop: espacio.xl,
  },
  card: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  oficios: { color: colores.primario, fontWeight: '600', marginTop: espacio.xs },
  dato: { color: colores.textoSuave, marginTop: espacio.xs },
  acciones: { flexDirection: 'row', marginTop: espacio.md },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
});
