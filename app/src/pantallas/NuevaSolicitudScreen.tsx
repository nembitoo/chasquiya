import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Oficio } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { SelectorFechaHora, aIsoLocal } from '../componentes/SelectorFechaHora';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'NuevaSolicitud'>;

export function NuevaSolicitudScreen({ route, navigation }: Props) {
  const { maestroId, maestroNombre, oficios } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [oficio, setOficio] = useState<Oficio | null>(oficios.length === 1 ? oficios[0] : null);
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState<Date | null>(null);
  const [presupuesto, setPresupuesto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar() {
    setError('');
    if (!oficio) {
      setError('Elige el tipo de servicio.');
      return;
    }
    if (!descripcion.trim()) {
      setError('Describe el problema.');
      return;
    }
    if (!direccion.trim()) {
      setError('Indica la dirección.');
      return;
    }
    try {
      setEnviando(true);
      await api.solicitudes.crear(token, {
        maestroId,
        oficio,
        descripcion: descripcion.trim(),
        direccion: direccion.trim(),
        fechaPreferida: fecha ? aIsoLocal(fecha) : null,
        presupuestoEstimado: presupuesto ? Number(presupuesto) : null,
      });
      // Vamos al listado para que vea su solicitud recién creada.
      navigation.navigate('Tabs', { screen: 'MisSolicitudes' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.titulo}>Solicitar servicio</Text>
        <Text style={styles.subtitulo}>a {maestroNombre}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.etiqueta}>Tipo de servicio</Text>
          <View style={styles.pills}>
            {OFICIOS.filter((o) => oficios.includes(o.valor)).map((o) => (
              <Pressable
                key={o.valor}
                onPress={() => setOficio(o.valor)}
                style={[styles.pildora, oficio === o.valor && styles.pildoraActiva]}>
                <Text style={[styles.pildoraTexto, oficio === o.valor && styles.pildoraTextoActivo]}>
                  {o.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>

          <CampoTexto
            etiqueta="Describe el problema"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            style={styles.multilinea}
            placeholder="Ej: se cortó la luz del living y salta el automático"
          />
          <CampoTexto
            etiqueta="Dirección"
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Calle, número, comuna"
          />
          <SelectorFechaHora
            etiqueta="Fecha y hora preferida (opcional)"
            valor={fecha}
            onCambio={setFecha}
          />
          <CampoTexto
            etiqueta="Presupuesto estimado (CLP, opcional)"
            value={presupuesto}
            onChangeText={setPresupuesto}
            keyboardType="number-pad"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Boton titulo="Enviar solicitud" onPress={enviar} cargando={enviando} />
          <Text style={styles.nota}>
            El maestro recibirá tu solicitud y podrá enviarte una cotización. Podrás aceptarla o rechazarla.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  subtitulo: { color: colores.textoSuave, marginTop: 2 },
  scroll: { padding: espacio.lg },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '600',
    marginBottom: espacio.sm,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.md },
  pildora: {
    borderRadius: radio.completo,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.blanco,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  pildoraActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pildoraTexto: { color: colores.textoSuave, fontWeight: '600' },
  pildoraTextoActivo: { color: colores.primario },
  multilinea: { height: 100, paddingTop: espacio.sm, textAlignVertical: 'top' },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  nota: {
    color: colores.textoSuave,
    fontSize: tipografia.pequeno,
    textAlign: 'center',
    marginTop: espacio.md,
  },
});
