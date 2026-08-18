import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { DocumentoResponse, EstadoVerificacion, Oficio } from '../api/tipos';
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
  const [comuna, setComuna] = useState<string | null>(null);
  const [cantidadServicios, setCantidadServicios] = useState(0);

  const [documentos, setDocumentos] = useState<DocumentoResponse[]>([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await api.perfilMaestro.obtener(token);
        if (p) {
          setOficios(p.oficios);
          setDescripcion(p.descripcion ?? '');
          setAniosExperiencia(String(p.aniosExperiencia));
          setComuna(p.zonaCobertura);
          setEstado(p.estadoVerificacion);
        }
        setDocumentos(await api.documentos.mios(token));
        setCantidadServicios((await api.catalogo.mios(token).catch(() => [])).length);
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

  async function agregarDocumento() {
    setErrorDoc('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setErrorDoc('Necesito permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (res.canceled) {
      return;
    }
    const asset = res.assets[0];
    try {
      setSubiendoDoc(true);
      await api.documentos.subir(
        token,
        asset.uri,
        asset.fileName ?? 'documento.jpg',
        asset.mimeType ?? 'image/jpeg',
      );
      setDocumentos(await api.documentos.mios(token));
    } catch (e) {
      setErrorDoc(e instanceof Error ? e.message : 'No se pudo subir el documento.');
    } finally {
      setSubiendoDoc(false);
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
          {/*
            Los precios ya no viven en el perfil: van en el catálogo, cada uno
            atado al trabajo que describe. Esta fila es el puente, para que no
            haya que descubrir la pantalla por su cuenta.
          */}
          <Pressable style={styles.filaCatalogo} onPress={() => navigation.navigate('MisServicios')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaCatalogoTitulo}>Mis servicios y precios</Text>
              <Text style={styles.filaCatalogoAyuda}>
                {cantidadServicios === 0
                  ? 'Necesitas al menos uno publicado para aparecer en las búsquedas'
                  : `${cantidadServicios} publicado${cantidadServicios === 1 ? '' : 's'}`}
              </Text>
            </View>
            <Text style={styles.filaCatalogoFlecha}>›</Text>
          </Pressable>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!exito && <Text style={styles.exito}>{exito}</Text>}

          <Boton titulo="Guardar perfil" onPress={guardar} cargando={guardando} />

          <Text style={[styles.etiqueta, { marginTop: espacio.xl }]}>Documentos de verificación</Text>
          <Text style={styles.ayuda}>
            Sube una foto de tu cédula o certificados. El administrador los revisa para aprobarte.
          </Text>
          {documentos.length > 0 && (
            <View style={styles.docs}>
              {documentos.map((d) => (
                <Image
                  key={d.id}
                  source={{ uri: api.documentos.urlMio(d.id), headers: { Authorization: `Bearer ${token}` } }}
                  style={styles.thumb}
                />
              ))}
            </View>
          )}
          {!!errorDoc && <Text style={styles.error}>{errorDoc}</Text>}
          <Boton
            titulo="Agregar documento (foto)"
            variante="secundario"
            onPress={agregarDocumento}
            cargando={subiendoDoc}
          />
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
  volver: {
    color: colores.primario,
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
    marginBottom: espacio.xs,
  },
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
  ayuda: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginBottom: espacio.md },
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
  docs: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.md },
  thumb: { width: 80, height: 80, borderRadius: radio.sm, backgroundColor: colores.borde },
  filaCatalogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.md,
    backgroundColor: colores.superficie,
  },
  filaCatalogoTitulo: { color: colores.texto, fontWeight: '700', fontSize: tipografia.cuerpo },
  filaCatalogoAyuda: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: 2 },
  filaCatalogoFlecha: { color: colores.primario, fontSize: tipografia.titulo, fontWeight: '700' },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  exito: { color: colores.exito, marginBottom: espacio.md, fontSize: tipografia.cuerpo, fontWeight: '600' },
});
