import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { Icono } from '../componentes/base/Icono';
import { Logo } from '../componentes/base/Logo';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Recuperar'>;
type Paso = 'correo' | 'codigo' | 'listo';

/** Recuperar contraseña en dos pasos: pedir el código y usarlo. */
export function RecuperarScreen({ navigation }: Props) {
  const [paso, setPaso] = useState<Paso>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function pedirCodigo() {
    setError('');
    if (!email.trim()) {
      setError('Ingresa tu correo.');
      return;
    }
    try {
      setCargando(true);
      await api.recuperar(email.trim());
      setPaso('codigo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el código.');
    } finally {
      setCargando(false);
    }
  }

  async function cambiarPassword() {
    setError('');
    if (codigo.trim().length < 6) {
      setError('Ingresa el código de 6 dígitos.');
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
    try {
      setCargando(true);
      await api.restablecer(codigo.trim(), password);
      setPaso('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centro}>
        <View style={styles.logo}>
          <Logo tamano="md" />
        </View>

        {paso === 'correo' && (
          <>
            <Text style={[t.h2, styles.titulo]}>Recuperar contraseña</Text>
            <Text style={styles.texto}>
              Ingresa tu correo y te enviaremos un código para crear una contraseña nueva.
            </Text>
            <CampoTexto
              etiqueta="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              icono="mail-outline"
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Boton titulo="Enviar código" onPress={pedirCodigo} cargando={cargando} />
          </>
        )}

        {paso === 'codigo' && (
          <>
            <Text style={[t.h2, styles.titulo]}>Revisa tu correo</Text>
            <Text style={styles.texto}>
              Si existe una cuenta con {email.trim()}, enviamos un código de 6 dígitos. Vence en 30
              minutos.
            </Text>
            <CampoTexto
              etiqueta="Código"
              value={codigo}
              onChangeText={setCodigo}
              keyboardType="number-pad"
              maxLength={6}
              icono="key-outline"
            />
            <CampoTexto
              etiqueta="Contraseña nueva"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              ayuda="Mínimo 8 caracteres."
            />
            <CampoTexto
              etiqueta="Repetir contraseña"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Boton titulo="Cambiar contraseña" onPress={cambiarPassword} cargando={cargando} />
            <Pressable onPress={pedirCodigo} style={styles.enlace}>
              <Text style={styles.enlaceTexto}>Enviar el código de nuevo</Text>
            </Pressable>
          </>
        )}

        {paso === 'listo' && (
          <View style={styles.exito}>
            <Icono nombre="checkmark-circle" tamano={64} color={colores.exito} />
            <Text style={[t.h2, styles.titulo]}>¡Listo!</Text>
            <Text style={styles.texto}>Ya puedes entrar con tu contraseña nueva.</Text>
            <Boton titulo="Iniciar sesión" onPress={() => navigation.replace('Login')} />
          </View>
        )}

        {paso !== 'listo' && (
          <Pressable onPress={() => navigation.goBack()} style={styles.enlace}>
            <Text style={styles.enlaceTexto}>Volver a iniciar sesión</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', padding: margenPantalla },
  logo: { alignItems: 'center', marginBottom: espacio.lg },
  titulo: { textAlign: 'center' },
  texto: { ...t.pequeno, textAlign: 'center', marginTop: espacio.xs, marginBottom: espacio.lg },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  enlace: { alignItems: 'center', marginTop: espacio.md },
  enlaceTexto: { ...t.pequenoFuerte, color: colores.primario },
  exito: { alignItems: 'center', alignSelf: 'stretch' },
});
