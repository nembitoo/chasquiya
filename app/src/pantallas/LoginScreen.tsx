import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '../componentes/Boton';
import { Logo } from '../componentes/base/Logo';
import { CampoTexto } from '../componentes/CampoTexto';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function enviar() {
    setError('');
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    try {
      setCargando(true);
      await iniciarSesion({ email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centro}>
        <View style={{ alignItems: 'center' }}>
          <Logo tamano="md" />
        </View>
        <Text style={styles.titulo}>Iniciar sesión</Text>

        <CampoTexto
          etiqueta="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <CampoTexto etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Boton titulo="Iniciar sesión" onPress={enviar} cargando={cargando} />
        <Pressable onPress={() => navigation.navigate('Recuperar')} style={styles.enlace}>
          <Text style={styles.enlaceTexto}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Registro')} style={styles.enlace}>
          <Text style={styles.enlaceTexto}>¿No tienes cuenta? Créala aquí</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', padding: espacio.lg },
  logo: { fontSize: 32, fontWeight: '800', color: colores.primario, textAlign: 'center' },
  titulo: {
    fontSize: tipografia.subtitulo,
    color: colores.textoSuave,
    textAlign: 'center',
    marginBottom: espacio.xl,
    marginTop: espacio.xs,
  },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  enlace: { alignItems: 'center', marginTop: espacio.lg },
  enlaceTexto: { color: colores.primario, fontWeight: '600' },
});
