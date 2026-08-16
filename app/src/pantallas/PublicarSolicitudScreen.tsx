import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
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
import { Direccion, Oficio } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { SelectorFechaHora, aIsoLocal } from '../componentes/SelectorFechaHora';
import { Icono } from '../componentes/base/Icono';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicarSolicitud'>;

/** Foto elegida en el teléfono, todavía sin subir. */
type FotoElegida = { uri: string; nombre: string; tipo: string };

/** Mismo tope que aplica el backend. */
const MAX_FOTOS = 5;

/**
 * Publicar un trabajo sin elegir maestro: varios cotizan y el cliente compara.
 *
 * Es el otro camino junto a "solicitar a este maestro". Sirve cuando el cliente
 * no sabe a quién llamar, que es el caso más común.
 */
export function PublicarSolicitudScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState<Date | null>(null);
  const [presupuesto, setPresupuesto] = useState('');
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const lista = await api.direcciones.mias(token);
        setDirecciones(lista);
        const principal = lista.find((d) => d.esPrincipal);
        if (principal) setDireccion(textoDireccion(principal));
      } catch {
        /* sin direcciones guardadas: se escribe a mano */
      }
      // La ubicación es opcional: sin ella el trabajo llega a todos los
      // maestros del oficio en vez de a los que están cerca.
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.granted) {
          const pos = await Location.getCurrentPositionAsync({});
          setUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
      } catch {
        /* sin GPS */
      }
    })();
  }, [token]);

  async function elegirFotos() {
    setError('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesito permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTOS - fotos.length,
      quality: 0.6,
    });
    if (res.canceled) return;

    setFotos((prev) =>
      [
        ...prev,
        ...res.assets.map((a, i) => ({
          uri: a.uri,
          nombre: a.fileName ?? `foto-${Date.now()}-${i}.jpg`,
          tipo: a.mimeType ?? 'image/jpeg',
        })),
      ].slice(0, MAX_FOTOS),
    );
  }

  async function publicar() {
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
      const creada = await api.solicitudes.publicarAbierta(token, {
        oficio,
        descripcion: descripcion.trim(),
        direccion: direccion.trim(),
        fechaPreferida: fecha ? aIsoLocal(fecha) : null,
        presupuestoEstimado: presupuesto ? Number(presupuesto) : null,
        latitud: ubicacion?.lat ?? null,
        longitud: ubicacion?.lon ?? null,
      });

      // Las fotos van después: recién ahora existe la solicitud a la que
      // pertenecen. Si alguna falla no se pierde la publicación.
      let fallidas = 0;
      for (const f of fotos) {
        try {
          await api.fotos.subir(token, creada.id, f.uri, f.nombre, f.tipo);
        } catch {
          fallidas += 1;
        }
      }
      if (fallidas > 0) {
        setError(`Se publicó, pero ${fallidas} foto(s) no se pudieron subir.`);
      }
      navigation.navigate('Tabs', { screen: 'MisSolicitudes' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar la solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Publicar trabajo</Text>
        <Text style={t.pequeno}>
          Los maestros de la zona verán tu solicitud y podrán enviarte su precio. Después eliges.
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.etiqueta}>¿Qué necesitas?</Text>
          <View style={styles.pills}>
            {OFICIOS.map((o) => (
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

          {direcciones.length > 0 && (
            <>
              <Text style={styles.etiqueta}>Mis direcciones</Text>
              <View style={styles.pills}>
                {direcciones.map((d) => {
                  const activa = direccion === textoDireccion(d);
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setDireccion(textoDireccion(d))}
                      style={[styles.pildora, activa && styles.pildoraActiva]}>
                      <Text style={[styles.pildoraTexto, activa && styles.pildoraTextoActivo]}>
                        {d.etiqueta}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

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
            ayuda="Ayuda a los maestros a saber si les calza."
          />

          <Text style={styles.etiqueta}>Fotos del problema</Text>
          <Text style={styles.ayudaFotos}>
            Muy recomendable: sin ver el problema, los maestros tienen que cotizar a ciegas y el
            precio suele cambiar al llegar.
          </Text>
          <View style={styles.fotos}>
            {fotos.map((f, i) => (
              <View key={f.uri + i} style={styles.miniatura}>
                <Image source={{ uri: f.uri }} style={styles.miniaturaImagen} />
                <Pressable
                  onPress={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                  hitSlop={8}
                  accessibilityLabel={`Quitar foto ${i + 1}`}
                  style={styles.quitarFoto}>
                  <Icono nombre="close" tamano="sm" color={colores.textoInverso} />
                </Pressable>
              </View>
            ))}
            {fotos.length < MAX_FOTOS && (
              <Pressable onPress={elegirFotos} style={styles.agregarFoto}>
                <Icono nombre="camera-outline" tamano="lg" color={colores.primario} />
                <Text style={styles.agregarFotoTexto}>Agregar</Text>
              </Pressable>
            )}
          </View>

          {!ubicacion && (
            <View style={styles.aviso}>
              <Icono nombre="information-circle-outline" tamano="sm" color={colores.textoSuave} />
              <Text style={styles.avisoTexto}>
                Sin permiso de ubicación tu trabajo se ofrece a todos los maestros del oficio, no
                solo a los cercanos.
              </Text>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Boton titulo="Publicar" onPress={publicar} cargando={enviando} />
          <Text style={styles.nota}>
            Publicar no te compromete a nada: recibes precios y decides si aceptas alguno.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function textoDireccion(d: Direccion): string {
  return d.comuna ? `${d.direccion}, ${d.comuna}` : d.direccion;
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  scroll: { padding: margenPantalla },
  etiqueta: { ...t.pequenoFuerte, color: colores.textoSuave, marginBottom: espacio.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs, marginBottom: espacio.md },
  pildora: {
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  pildoraActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pildoraTexto: { ...t.pequeno },
  pildoraTextoActivo: { color: colores.primario, fontWeight: '700' },
  multilinea: { height: 110, textAlignVertical: 'top' },
  ayudaFotos: { ...t.etiqueta, color: colores.textoTenue, marginTop: -espacio.xs, marginBottom: espacio.sm },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.md },
  miniatura: { width: 84, height: 84, borderRadius: radio.sm },
  miniaturaImagen: { width: 84, height: 84, borderRadius: radio.sm },
  quitarFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colores.texto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregarFoto: {
    width: 84,
    height: 84,
    borderRadius: radio.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colores.primario,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  agregarFotoTexto: { ...t.etiqueta, color: colores.primario, fontWeight: '600' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.xxs,
    backgroundColor: colores.superficie,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.sm,
    marginBottom: espacio.sm,
  },
  avisoTexto: { ...t.etiqueta, color: colores.textoSuave, flex: 1 },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  nota: { ...t.etiqueta, textAlign: 'center', marginTop: espacio.sm },
});
