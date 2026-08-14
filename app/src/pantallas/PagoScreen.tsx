import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { ResumenPago } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'Pago'>;

export function PagoScreen({ route, navigation }: Props) {
  const { solicitudId } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [resumen, setResumen] = useState<ResumenPago | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.pagos.resumen(token, solicitudId);
        setResumen(r);
        setPagado(r.yaPagado);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el pago.');
      } finally {
        setCargando(false);
      }
    })();
  }, [token, solicitudId]);

  async function pagar() {
    setError('');
    setPagando(true);
    try {
      await api.pagos.pagar(token, solicitudId);
      setPagado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el pago.');
    } finally {
      setPagando(false);
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.centro]}>
        <ActivityIndicator size="large" color={colores.primario} />
      </SafeAreaView>
    );
  }

  // Pantalla de pago exitoso.
  if (pagado) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <View style={styles.exitoCaja}>
          <Text style={styles.exitoIcono}>✅</Text>
          <Text style={styles.exitoTitulo}>¡Pago realizado!</Text>
          <Text style={styles.exitoTexto}>
            El servicio quedó pagado{resumen ? ` a ${resumen.maestroNombre}` : ''}.
          </Text>
          {!!resumen && <Text style={styles.exitoMonto}>{formatearCLP(resumen.montoServicio)}</Text>}
          <Text style={styles.nota}>Recuerda: es un pago simulado, no se movió dinero real.</Text>
          <View style={styles.exitoBoton}>
            <Boton titulo="Volver a mis servicios" onPress={() => navigation.navigate('MisSolicitudes')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.titulo}>Pagar servicio</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!!resumen && (
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.seccion}>Resumen</Text>
              <Fila etiqueta="Maestro" valor={resumen.maestroNombre} />
              <Fila etiqueta="Servicio acordado" valor={formatearCLP(resumen.montoServicio)} />
              <View style={styles.separador} />
              <Fila etiqueta="Total a pagar" valor={formatearCLP(resumen.montoServicio)} destacado />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.seccion}>Método de pago</Text>
              <View style={styles.metodo}>
                <Text style={styles.metodoIcono}>🧪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metodoTitulo}>Pago simulado</Text>
                  <Text style={styles.metodoTexto}>
                    Esta versión no procesa dinero real ni pide datos de tarjeta.
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.detalleComision}>
              De este monto, ChasquiYa! retiene una comisión de{' '}
              {formatearCLP(resumen.comision)} ({resumen.porcentajeComision}%) y el maestro recibe{' '}
              {formatearCLP(resumen.montoServicio - resumen.comision)}.
            </Text>
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Boton titulo="Pagar servicio" onPress={pagar} cargando={pagando} deshabilitado={!resumen} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Fila({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <View style={styles.fila}>
      <Text style={[styles.filaEtiqueta, destacado && styles.filaDestacada]}>{etiqueta}</Text>
      <Text style={[styles.filaValor, destacado && styles.filaDestacada]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  scroll: { padding: espacio.lg },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  seccion: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '700',
    marginBottom: espacio.sm,
    textTransform: 'uppercase',
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: espacio.xs },
  filaEtiqueta: { color: colores.textoSuave, fontSize: tipografia.cuerpo },
  filaValor: { color: colores.texto, fontSize: tipografia.cuerpo, fontWeight: '600' },
  filaDestacada: { color: colores.texto, fontWeight: '800', fontSize: tipografia.subtitulo },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: espacio.sm },
  metodo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  metodoIcono: { fontSize: 24 },
  metodoTitulo: { color: colores.texto, fontWeight: '700' },
  metodoTexto: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: 2 },
  detalleComision: {
    color: colores.textoSuave,
    fontSize: tipografia.pequeno,
    marginBottom: espacio.lg,
    lineHeight: 18,
  },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  exitoCaja: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacio.lg },
  exitoIcono: { fontSize: 56 },
  exitoTitulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto, marginTop: espacio.md },
  exitoTexto: { color: colores.textoSuave, marginTop: espacio.sm, textAlign: 'center' },
  exitoMonto: { fontSize: 32, fontWeight: '800', color: colores.primario, marginTop: espacio.md },
  nota: {
    color: colores.textoSuave,
    fontSize: tipografia.pequeno,
    marginTop: espacio.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exitoBoton: { alignSelf: 'stretch', marginTop: espacio.xl },
});
