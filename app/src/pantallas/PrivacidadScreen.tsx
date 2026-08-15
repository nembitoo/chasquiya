import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { Card } from '../componentes/base/Card';
import { Icono } from '../componentes/base/Icono';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacidad'>;

/**
 * Derechos del titular de datos (Ley 21.719): descargar una copia de tus datos
 * y eliminar la cuenta.
 */
export function PrivacidadScreen({ navigation }: Props) {
  const { sesion, cerrarSesion } = useAuth();
  const token = sesion?.token ?? '';

  const [datos, setDatos] = useState<string>('');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  async function verMisDatos() {
    setError('');
    setCargandoDatos(true);
    try {
      const json = await api.privacidad.misDatos(token);
      setDatos(JSON.stringify(json, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron obtener tus datos.');
    } finally {
      setCargandoDatos(false);
    }
  }

  async function eliminarCuenta() {
    setError('');
    setEliminando(true);
    try {
      await api.privacidad.eliminarCuenta(token);
      setConfirmando(false);
      // La sesión ya no sirve: la cuenta quedó anonimizada.
      await cerrarSesion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.');
      setConfirmando(false);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Privacidad</Text>
        <Text style={styles.subtitulo}>Tus derechos sobre tus datos (Ley 21.719)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Acceso y portabilidad */}
        <Card>
          <View style={styles.filaTitulo}>
            <Icono nombre="download-outline" tamano="lg" color={colores.primario} />
            <Text style={t.h3}>Descargar mis datos</Text>
          </View>
          <Text style={styles.descripcion}>
            Obtén una copia de toda la información que ChasquiYa! tiene sobre ti: tu cuenta,
            servicios, mensajes, calificaciones y pagos.
          </Text>
          <Boton
            titulo={datos ? 'Actualizar copia' : 'Ver mis datos'}
            variante="secundario"
            cargando={cargandoDatos}
            onPress={verMisDatos}
          />
          {!!datos && (
            <View style={styles.jsonCaja}>
              <Text style={styles.json} selectable>
                {datos}
              </Text>
            </View>
          )}
          {!!datos && (
            <Text style={styles.ayuda}>
              Mantén presionado el texto para copiarlo. La descarga como archivo llegará junto con
              el envío por correo.
            </Text>
          )}
        </Card>

        {/* Rectificación */}
        <Card>
          <View style={styles.filaTitulo}>
            <Icono nombre="create-outline" tamano="lg" color={colores.primario} />
            <Text style={t.h3}>Corregir mis datos</Text>
          </View>
          <Text style={styles.descripcion}>
            Puedes actualizar tu nombre, apellido y teléfono cuando quieras.
          </Text>
          <Boton titulo="Ir a Mis datos" variante="secundario" onPress={() => navigation.navigate('MisDatos')} />
        </Card>

        {/* Supresión */}
        <Card>
          <View style={styles.filaTitulo}>
            <Icono nombre="trash-outline" tamano="lg" color={colores.error} />
            <Text style={t.h3}>Eliminar mi cuenta</Text>
          </View>
          <Text style={styles.descripcion}>
            Se borran tus datos personales: nombre, correo, teléfono, foto, direcciones, documentos
            y el contenido de tus mensajes.
          </Text>
          <Text style={styles.descripcion}>
            Por obligación tributaria conservamos el registro contable de los pagos ya realizados,
            pero sin tus datos identificatorios.
          </Text>
          <Text style={styles.advertencia}>Esta acción no se puede deshacer.</Text>
          <Boton titulo="Eliminar mi cuenta" variante="peligro" onPress={() => setConfirmando(true)} />
        </Card>

        <Pressable onPress={() => navigation.navigate('Legal', { inicial: 'privacidad' })}>
          <Text style={styles.enlace}>Leer la política de privacidad completa</Text>
        </Pressable>
      </ScrollView>

      {/* Confirmación */}
      <Modal visible={confirmando} transparent animationType="fade" onRequestClose={() => setConfirmando(false)}>
        <View style={styles.modalFondo}>
          <View style={styles.dialogo}>
            <Icono nombre="warning" tamano={40} color={colores.error} />
            <Text style={[t.h3, styles.dialogoTitulo]}>¿Eliminar tu cuenta?</Text>
            <Text style={styles.dialogoTexto}>
              Perderás el acceso a ChasquiYa! y tus datos personales se borrarán de forma
              permanente.
            </Text>
            <Boton
              titulo="Sí, eliminar mi cuenta"
              variante="peligro"
              cargando={eliminando}
              onPress={eliminarCuenta}
            />
            <View style={{ height: espacio.xs }} />
            <Boton titulo="Cancelar" variante="terciario" onPress={() => setConfirmando(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  subtitulo: { ...t.pequeno, marginTop: 2 },
  scroll: { padding: margenPantalla },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, marginBottom: espacio.xs },
  descripcion: { ...t.pequeno, marginBottom: espacio.sm },
  advertencia: { ...t.pequenoFuerte, color: colores.error, marginBottom: espacio.sm },
  ayuda: { ...t.etiqueta, marginTop: espacio.xs },
  jsonCaja: {
    backgroundColor: colores.neutral[900],
    borderRadius: radio.sm,
    padding: espacio.sm,
    marginTop: espacio.sm,
    maxHeight: 260,
  },
  json: { color: colores.neutral[100], fontSize: 11, fontFamily: 'monospace' },
  enlace: { ...t.pequenoFuerte, color: colores.primario, textAlign: 'center', marginTop: espacio.md },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: margenPantalla,
  },
  dialogo: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    padding: espacio.lg,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dialogoTitulo: { marginTop: espacio.sm },
  dialogoTexto: { ...t.pequeno, textAlign: 'center', marginVertical: espacio.md },
});
