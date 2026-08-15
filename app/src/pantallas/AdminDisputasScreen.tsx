import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Solicitud } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'AdminDisputas'>;

export function AdminDisputasScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [disputas, setDisputas] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [nota, setNota] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDisputas(await api.disputas.abiertas(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las disputas.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function resolver(id: number, aFavorDelCliente: boolean) {
    setError('');
    setProcesando(id);
    try {
      await api.disputas.resolver(token, id, aFavorDelCliente, nota.trim());
      setDisputas((prev) => prev.filter((d) => d.id !== id));
      setResolviendo(null);
      setNota('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo resolver la disputa.');
    } finally {
      setProcesando(null);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Disputas abiertas</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}

          {disputas.length === 0 && !error ? (
            <Text style={styles.vacio}>No hay disputas abiertas 🎉</Text>
          ) : (
            disputas.map((d) => (
              <View key={d.id} style={styles.card}>
                <Text style={styles.partes}>
                  {d.clienteNombre} <Text style={styles.vs}>vs</Text> {d.maestroNombre}
                </Text>
                <Text style={styles.servicio}>
                  {d.descripcion} · {formatearCLP(d.cotizacionMonto)}
                </Text>
                <View style={styles.motivoCaja}>
                  <Text style={styles.motivoEtiqueta}>Motivo reportado</Text>
                  <Text style={styles.motivo}>{d.motivoCancelacion ?? 'Sin detalle'}</Text>
                </View>

                {resolviendo === d.id ? (
                  <View style={styles.formulario}>
                    <CampoTexto
                      etiqueta="Resolución (queda registrada)"
                      value={nota}
                      onChangeText={setNota}
                      multiline
                      numberOfLines={3}
                      style={styles.multilinea}
                      placeholder="Explica brevemente qué se resolvió y por qué"
                    />
                    <Boton
                      titulo="A favor del cliente (anular)"
                      cargando={procesando === d.id}
                      onPress={() => resolver(d.id, true)}
                    />
                    <View style={{ height: espacio.sm }} />
                    <Boton
                      titulo="A favor del maestro (dar por bueno)"
                      variante="secundario"
                      deshabilitado={procesando === d.id}
                      onPress={() => resolver(d.id, false)}
                    />
                    <View style={{ height: espacio.sm }} />
                    <Pressable onPress={() => setResolviendo(null)}>
                      <Text style={styles.cancelar}>Cancelar</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ marginTop: espacio.md }}>
                    <Boton
                      titulo="Mediar y resolver"
                      onPress={() => {
                        setResolviendo(d.id);
                        setNota('');
                      }}
                    />
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  lista: { padding: espacio.lg },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: espacio.xl },
  card: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  partes: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  vs: { color: colores.textoSuave, fontWeight: '400' },
  servicio: { color: colores.textoSuave, marginTop: espacio.xs },
  motivoCaja: {
    marginTop: espacio.md,
    backgroundColor: '#FEE2E2',
    borderRadius: radio.sm,
    padding: espacio.sm,
  },
  motivoEtiqueta: { color: '#991B1B', fontSize: tipografia.pequeno, fontWeight: '700' },
  motivo: { color: '#991B1B', marginTop: 2 },
  formulario: { marginTop: espacio.md },
  multilinea: { height: 80, paddingTop: espacio.sm, textAlignVertical: 'top' },
  cancelar: { color: colores.textoSuave, textAlign: 'center', fontWeight: '600' },
  error: { color: colores.error, marginBottom: espacio.md },
});
