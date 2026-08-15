import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { Icono } from '../componentes/base/Icono';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'MisDatos'>;

export function MisDatosScreen({ navigation }: Props) {
  const { sesion, refrescar } = useAuth();
  const token = sesion?.token ?? '';

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const u = await api.yo(token);
        setNombre(u.nombre);
        setApellido(u.apellido);
        setTelefono(u.telefono ?? '');
        setEmail(u.email);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar tus datos.');
      } finally {
        setCargando(false);
      }
    })();
  }, [token]);

  async function guardar() {
    setError('');
    setExito('');
    if (!nombre.trim() || !apellido.trim()) {
      setError('El nombre y el apellido son obligatorios.');
      return;
    }
    try {
      setGuardando(true);
      await api.usuarios.actualizarPerfil(token, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
      });
      await refrescar();
      setExito('Datos actualizados.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mis datos</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!cargando && (
            <>
              <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} icono="person-outline" />
              <CampoTexto etiqueta="Apellido" value={apellido} onChangeText={setApellido} />
              <CampoTexto
                etiqueta="Teléfono"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
                icono="call-outline"
                ayuda="El maestro lo usa para coordinar contigo."
              />
              <CampoTexto
                etiqueta="Correo electrónico"
                value={email}
                editable={false}
                icono="mail-outline"
                ayuda="El correo identifica tu cuenta y no se puede cambiar."
                style={styles.deshabilitado}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!exito && <Text style={styles.exito}>{exito}</Text>}

              <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  scroll: { padding: margenPantalla },
  deshabilitado: { color: colores.textoSuave },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  exito: { ...t.pequenoFuerte, color: colores.exito, marginBottom: espacio.sm },
});
