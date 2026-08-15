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

import { Boton } from '../componentes/Boton';
import { Icono } from '../componentes/base/Icono';
import { CampoTexto } from '../componentes/CampoTexto';
import { Rol } from '../api/tipos';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export function RegistroScreen({ navigation }: Props) {
  const { registrar } = useAuth();
  const [rol, setRol] = useState<Rol>('CLIENTE');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [terminos, setTerminos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function enviar() {
    setError('');
    if (!nombre || !apellido || !email || !telefono || !password) {
      setError('Completa todos los campos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!terminos) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }
    try {
      setCargando(true);
      await registrar({ nombre, apellido, email, telefono, password, rol, aceptoTerminos: terminos });
      // Al crear la sesión, la navegación cambia sola a la pantalla de Inicio.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>Crear cuenta</Text>

          <Text style={styles.etiquetaRol}>Quiero…</Text>
          <View style={styles.selectorRol}>
            <PildoraRol texto="Contratar" activo={rol === 'CLIENTE'} onPress={() => setRol('CLIENTE')} />
            <PildoraRol
              texto="Ofrecer servicios"
              activo={rol === 'MAESTRO'}
              onPress={() => setRol('MAESTRO')}
            />
          </View>

          <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} />
          <CampoTexto etiqueta="Apellido" value={apellido} onChangeText={setApellido} />
          <CampoTexto
            etiqueta="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <CampoTexto
            etiqueta="Teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />
          <CampoTexto etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
          />

          <Pressable style={styles.terminos} onPress={() => setTerminos(!terminos)}>
            <View style={[styles.checkbox, terminos && styles.checkboxActivo]}>
              {terminos && <Icono nombre="checkmark" tamano="sm" color={colores.blanco} />}
            </View>
            <Text style={styles.terminosTexto}>
              Acepto los{' '}
              <Text style={styles.enlaceTexto} onPress={() => navigation.navigate('Legal')}>
                términos y condiciones
              </Text>{' '}
              y la{' '}
              <Text
                style={styles.enlaceTexto}
                onPress={() => navigation.navigate('Legal', { inicial: 'privacidad' })}>
                política de privacidad
              </Text>
            </Text>
          </Pressable>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.enlace}>
            <Text style={styles.enlaceTexto}>¿Ya tienes cuenta? Inicia sesión</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PildoraRol({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pildora, activo && styles.pildoraActiva]}>
      <Text style={[styles.pildoraTexto, activo && styles.pildoraTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  scroll: { padding: espacio.lg },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto, marginBottom: espacio.lg },
  etiquetaRol: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    marginBottom: espacio.xs,
    fontWeight: '600',
  },
  selectorRol: { flexDirection: 'row', gap: espacio.sm, marginBottom: espacio.md },
  pildora: {
    flex: 1,
    height: 46,
    borderRadius: radio.md,
    borderWidth: 1.5,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.blanco,
  },
  pildoraActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pildoraTexto: { color: colores.textoSuave, fontWeight: '600' },
  pildoraTextoActivo: { color: colores.primario },
  terminos: { flexDirection: 'row', alignItems: 'center', marginVertical: espacio.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radio.sm,
    borderWidth: 1.5,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacio.sm,
  },
  checkboxActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  check: { color: colores.blanco, fontWeight: '800', fontSize: 14 },
  terminosTexto: { color: colores.texto, fontSize: tipografia.cuerpo, flexShrink: 1 },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  enlace: { alignItems: 'center', marginTop: espacio.lg },
  enlaceTexto: { color: colores.primario, fontWeight: '600' },
});
