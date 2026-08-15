import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Ingresos } from '../api/tipos';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'Ingresos'>;

export function IngresosScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [datos, setDatos] = useState<Ingresos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDatos(await api.pagos.misIngresos(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus ingresos.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Para el gráfico: la barra más alta marca el 100%.
  const maximo = datos?.ultimosMeses.reduce((max, m) => Math.max(max, m.monto), 0) ?? 0;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Mis ingresos</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {!!datos && (
            <>
              <View style={styles.destacado}>
                <Text style={styles.destacadoEtiqueta}>Este mes</Text>
                <Text style={styles.destacadoMonto}>{formatearCLP(datos.totalMes)}</Text>
              </View>

              <View style={styles.filaTarjetas}>
                <Tarjeta etiqueta="Total acumulado" valor={formatearCLP(datos.totalAcumulado)} />
                <Tarjeta etiqueta="Servicios pagados" valor={String(datos.serviciosPagados)} />
              </View>
              <View style={styles.filaTarjetas}>
                <Tarjeta etiqueta="Por cobrar" valor={String(datos.serviciosPorCobrar)} />
                <Tarjeta
                  etiqueta="Promedio por servicio"
                  valor={formatearCLP(
                    datos.serviciosPagados > 0
                      ? Math.round(datos.totalAcumulado / datos.serviciosPagados)
                      : 0,
                  )}
                />
              </View>

              {datos.ultimosMeses.length > 0 && (
                <View style={styles.grafico}>
                  <Text style={styles.seccion}>Ingresos por mes</Text>
                  {datos.ultimosMeses.map((m) => (
                    <View key={m.mes} style={styles.barraFila}>
                      <Text style={styles.barraMes}>{m.mes}</Text>
                      <View style={styles.barraPista}>
                        <View
                          style={[
                            styles.barra,
                            { width: `${maximo > 0 ? Math.max(6, (m.monto / maximo) * 100) : 0}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.barraMonto}>{formatearCLP(m.monto)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {datos.serviciosPagados === 0 && (
                <Text style={styles.vacio}>
                  Aún no tienes pagos recibidos. Cuando completes servicios y el cliente pague,
                  aparecerán aquí.
                </Text>
              )}

              <Text style={styles.nota}>
                Los montos ya tienen descontada la comisión de ChasquiYa!. Pagos simulados: no
                corresponden a dinero real.
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Tarjeta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.tarjeta}>
      <Text style={styles.tarjetaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.tarjetaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  scroll: { padding: espacio.lg },
  destacado: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
  destacadoEtiqueta: { color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  destacadoMonto: { color: colores.blanco, fontSize: 34, fontWeight: '800', marginTop: espacio.xs },
  filaTarjetas: { flexDirection: 'row', gap: espacio.sm, marginBottom: espacio.sm },
  tarjeta: {
    flex: 1,
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
  },
  tarjetaEtiqueta: { color: colores.textoSuave, fontSize: tipografia.pequeno },
  tarjetaValor: { color: colores.texto, fontSize: tipografia.subtitulo, fontWeight: '800', marginTop: espacio.xs },
  grafico: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginTop: espacio.md,
  },
  seccion: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: espacio.md,
  },
  barraFila: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.sm, gap: espacio.sm },
  barraMes: { width: 60, color: colores.textoSuave, fontSize: tipografia.pequeno },
  barraPista: { flex: 1, height: 12, backgroundColor: colores.fondo, borderRadius: radio.completo },
  barra: { height: 12, backgroundColor: colores.primario, borderRadius: radio.completo },
  barraMonto: { width: 80, textAlign: 'right', color: colores.texto, fontSize: tipografia.pequeno, fontWeight: '600' },
  vacio: { color: colores.textoSuave, textAlign: 'center', marginTop: espacio.lg, paddingHorizontal: espacio.md },
  nota: {
    color: colores.textoSuave,
    fontSize: tipografia.pequeno,
    marginTop: espacio.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  error: { color: colores.error, marginBottom: espacio.md },
});
