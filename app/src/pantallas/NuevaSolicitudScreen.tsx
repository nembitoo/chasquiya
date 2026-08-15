import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { Icono } from '../componentes/base/Icono';
import { CampoTexto } from '../componentes/CampoTexto';
import { SelectorFechaHora, aIsoLocal, formatearFechaHoraTexto } from '../componentes/SelectorFechaHora';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'NuevaSolicitud'>;

/** Foto elegida en el teléfono, todavía sin subir. */
type FotoElegida = { uri: string; nombre: string; tipo: string };

/** Mismo tope que aplica el backend. */
const MAX_FOTOS = 5;

export function NuevaSolicitudScreen({ route, navigation }: Props) {
  const { maestroId, maestroNombre, oficios, precargar } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [oficio, setOficio] = useState<Oficio | null>(oficios.length === 1 ? oficios[0] : null);
  const [descripcion, setDescripcion] = useState(precargar?.descripcion ?? '');
  const [direccion, setDireccion] = useState(precargar?.direccion ?? '');
  const [fecha, setFecha] = useState<Date | null>(null);
  const [presupuesto, setPresupuesto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState('');

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

    const nuevas = res.assets.map((a, i) => ({
      uri: a.uri,
      nombre: a.fileName ?? `foto-${Date.now()}-${i}.jpg`,
      tipo: a.mimeType ?? 'image/jpeg',
    }));
    setFotos((prev) => [...prev, ...nuevas].slice(0, MAX_FOTOS));
  }

  // Trae las direcciones guardadas para elegir con un toque.
  useEffect(() => {
    (async () => {
      try {
        const lista = await api.direcciones.mias(token);
        setDirecciones(lista);
        // Si no venimos de "volver a contratar", proponemos la principal.
        if (!precargar) {
          const principal = lista.find((d) => d.esPrincipal);
          if (principal) {
            setDireccion(textoDireccion(principal));
          }
        }
      } catch {
        /* sin direcciones guardadas: se escribe a mano */
      }
    })();
  }, [token, precargar]);

  /** Valida y muestra el resumen. Enviar de verdad es el paso siguiente. */
  function revisar() {
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
    setRevisando(true);
  }

  async function enviar() {
    if (!oficio) return;
    setError('');
    setRevisando(false);
    try {
      setEnviando(true);
      const creada = await api.solicitudes.crear(token, {
        maestroId,
        oficio,
        descripcion: descripcion.trim(),
        direccion: direccion.trim(),
        fechaPreferida: fecha ? aIsoLocal(fecha) : null,
        presupuestoEstimado: presupuesto ? Number(presupuesto) : null,
      });

      // Las fotos se suben después: recién ahora existe la solicitud a la que pertenecen.
      // Si alguna falla no se pierde la solicitud, que es lo importante.
      let fallidas = 0;
      for (const f of fotos) {
        try {
          await api.fotos.subir(token, creada.id, f.uri, f.nombre, f.tipo);
        } catch {
          fallidas += 1;
        }
      }
      if (fallidas > 0) {
        setError(`Tu solicitud se envió, pero ${fallidas} foto(s) no se pudieron subir.`);
      }

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
        {!!precargar && (
          <Text style={styles.precargado}>Datos del servicio anterior: revísalos y ajústalos.</Text>
        )}
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
                      <Icono
                        nombre="location-outline"
                        tamano="sm"
                        color={activa ? colores.primario : colores.textoSuave}
                      />
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
          />

          <Text style={styles.etiqueta}>Fotos del problema (opcional)</Text>
          <Text style={styles.ayudaFotos}>
            Una foto ayuda al maestro a cotizar mejor y te ahorra explicaciones.
          </Text>
          <View style={styles.fotos}>
            {fotos.map((f, i) => (
              <View key={f.uri + i} style={styles.miniatura}>
                <Image source={{ uri: f.uri }} style={styles.miniaturaImagen} />
                <Pressable
                  onPress={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar foto ${i + 1}`}
                  style={styles.quitarFoto}>
                  <Icono nombre="close" tamano="sm" color={colores.textoInverso} />
                </Pressable>
              </View>
            ))}
            {fotos.length < MAX_FOTOS && (
              <Pressable onPress={elegirFotos} style={styles.agregarFoto} accessibilityRole="button">
                <Icono nombre="camera-outline" tamano="lg" color={colores.primario} />
                <Text style={styles.agregarFotoTexto}>Agregar</Text>
              </Pressable>
            )}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Boton titulo="Revisar y enviar" onPress={revisar} cargando={enviando} />
          <Text style={styles.nota}>
            El maestro recibirá tu solicitud y podrá enviarte una cotización. Podrás aceptarla o rechazarla.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paso de confirmación: revisar antes de que le llegue a alguien. */}
      <Modal visible={revisando} transparent animationType="slide" onRequestClose={() => setRevisando(false)}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Revisa tu solicitud</Text>

            <FilaResumen etiqueta="Maestro" valor={maestroNombre} />
            <FilaResumen
              etiqueta="Servicio"
              valor={OFICIOS.find((o) => o.valor === oficio)?.etiqueta ?? '—'}
            />
            <FilaResumen etiqueta="Problema" valor={descripcion.trim()} />
            <FilaResumen etiqueta="Dirección" valor={direccion.trim()} />
            <FilaResumen
              etiqueta="Fecha"
              valor={fecha ? formatearFechaHoraTexto(aIsoLocal(fecha)) : 'A convenir'}
            />
            <FilaResumen
              etiqueta="Presupuesto"
              valor={presupuesto ? formatearCLP(Number(presupuesto)) : 'Sin presupuesto estimado'}
            />
            <FilaResumen
              etiqueta="Fotos"
              valor={fotos.length === 0 ? 'Ninguna' : `${fotos.length} adjunta(s)`}
            />

            <Text style={styles.modalNota}>
              Todavía no es un compromiso: el maestro te enviará un precio y tú decides.
            </Text>

            <Boton titulo="Confirmar y enviar" onPress={enviar} cargando={enviando} />
            <Boton
              titulo="Volver a editar"
              variante="secundario"
              onPress={() => setRevisando(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.filaResumen}>
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

/** Junta dirección y comuna en una sola línea. */
function textoDireccion(d: Direccion): string {
  return d.comuna ? `${d.direccion}, ${d.comuna}` : d.direccion;
}

const styles = StyleSheet.create({
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
    padding: espacio.lg,
    gap: espacio.xs,
  },
  modalTitulo: {
    fontSize: tipografia.titulo,
    fontWeight: '800',
    color: colores.texto,
    marginBottom: espacio.sm,
  },
  modalNota: {
    fontSize: tipografia.pequeno,
    color: colores.textoTenue,
    marginTop: espacio.sm,
    marginBottom: espacio.sm,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    paddingVertical: espacio.xs,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  filaEtiqueta: { width: 96, fontSize: tipografia.pequeno, color: colores.textoSuave, fontWeight: '600' },
  filaValor: { flex: 1, fontSize: tipografia.cuerpo, color: colores.texto },
  ayudaFotos: {
    fontSize: tipografia.pequeno,
    color: colores.textoTenue,
    marginTop: -espacio.xs,
    marginBottom: espacio.sm,
  },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.lg },
  miniatura: { width: 84, height: 84, borderRadius: radio.sm, overflow: 'visible' },
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
  agregarFotoTexto: { fontSize: tipografia.pequeno, color: colores.primario, fontWeight: '600' },
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  subtitulo: { color: colores.textoSuave, marginTop: 2 },
  precargado: { color: colores.primario, fontSize: tipografia.pequeno, marginTop: espacio.xs },
  scroll: { padding: espacio.lg },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '600',
    marginBottom: espacio.sm,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.md },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
