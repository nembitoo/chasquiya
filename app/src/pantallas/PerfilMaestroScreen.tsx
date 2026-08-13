import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { EstadoVerificacion, Oficio } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { COMUNAS } from '../datos/comunas';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'PerfilMaestro'>;

const ESTADOS: Record<EstadoVerificacion, { texto: string; fondo: string; color: string }> = {
  PENDIENTE: { texto: 'En revisión', fondo: '#FEF3C7', color: '#92400E' },
  APROBADO: { texto: 'Aprobado ✓', fondo: '#DCFCE7', color: '#166534' },
  RECHAZADO: { texto: 'Rechazado', fondo: '#FEE2E2', color: '#991B1B' },
};

export function PerfilMaestroScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [estado, setEstado] = useState<EstadoVerificacion | null>(null);

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [aniosExperiencia, setAniosExperiencia] = useState('0');
  const [tarifa, setTarifa] = useState('');
  const [comuna, setComuna] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.perfilMaestro.obtener(token);
        if (p) {
          setOficios(p.oficios);
          setDescripcion(p.descripcion ?? '');
          setAniosExperiencia(String(p.aniosExperiencia));
          setTarifa(p.tarifaReferencial != null ? String(p.tarifaReferencial) : '');
          setComuna(p.zonaCobertura);
          setEstado(p.estadoVerificacion);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      } finally {
        setCargandoInicial(false);
      }
    })();
  }, [token]);

  function alternarOficio(o: Oficio) {
    setOficios((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  }

  async function guardar() {
    setError('');
    setExito('');
    if (oficios.length === 0) {
      setError('Elige al menos un oficio.');
      return;
    }
    if (!comuna) {
      setError('Elige tu comuna.');
      return;
    }
    const c = COMUNAS.find((x) => x.nombre === comuna);
    try {
      setGuardando(true);
      const p = await api.perfilMaestro.guardar(token, {
        oficios,
        descripcion,
        aniosExperiencia: Number(aniosExperiencia) || 0,
        tarifaReferencial: tarifa ? Number(tarifa) : null,
        zonaCobertura: comuna,
        latitud: c ? c.latitud : null,
        longitud: c ? c.longitud : null,
      });
      setEstado(p.estadoVerificacion);
      setExito('Perfil guardado. Un administrador lo revisará.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargandoInicial) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.centro]}>
        <ActivityIndicator size="large" color={colores.primario} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.titulo}>Mi perfil profesional</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {estado && (
            <View style={[styles.estado, { backgroundColor: ESTADOS[estado].fondo }]}>
              <Text style={[styles.estadoTexto, { color: ESTADOS[estado].color }]}>
                Estado: {ESTADOS[estado].texto}
              </Text>
            </View>
          )}

          <Text style={styles.etiqueta}>¿Qué oficios ofreces?</Text>
          <View style={styles.pills}>
            {OFICIOS.map((o) => (
              <Pildora
                key={o.valor}
                texto={o.etiqueta}
                activo={oficios.includes(o.valor)}
                onPress={() => alternarOficio(o.valor)}
              />
            ))}
          </View>

          <Text style={styles.etiqueta}>¿En qué comuna trabajas?</Text>
          <View style={styles.pills}>
            {COMUNAS.map((c) => (
              <Pildora
                key={c.nombre}
                texto={c.nombre}
                activo={comuna === c.nombre}
                onPress={() => setComuna(c.nombre)}
              />
            ))}
          </View>

          <CampoTexto
            etiqueta="Descripción (cuéntale a los clientes sobre ti)"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            style={styles.multilinea}
          />
          <CampoTexto
            etiqueta="Años de experiencia"
            value={aniosExperiencia}
            onChangeText={setAniosExperiencia}
            keyboardType="number-pad"
          />
          <CampoTexto
            etiqueta="Tarifa referencial (CLP, opcional)"
            value={tarifa}
            onChangeText={setTarifa}
            keyboardType="number-pad"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!exito && <Text style={styles.exito}>{exito}</Text>}

          <Boton titulo="Guardar perfil" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Pildora({
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
  centro: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm, paddingBottom: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  scroll: { paddingHorizontal: espacio.lg, paddingBottom: espacio.xl },
  estado: {
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
    marginBottom: espacio.md,
  },
  estadoTexto: { fontWeight: '700' },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '600',
    marginBottom: espacio.sm,
    marginTop: espacio.sm,
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
  exito: { color: colores.exito, marginBottom: espacio.md, fontSize: tipografia.cuerpo, fontWeight: '600' },
});
