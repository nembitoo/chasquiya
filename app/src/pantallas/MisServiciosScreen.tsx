import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Oficio, ServicioCatalogo } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { Card } from '../componentes/base/Card';
import { Icono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { NOMBRE_OFICIO } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'MisServicios'>;

const VACIO = { titulo: '', descripcion: '', precio: '', unidad: '', precioFijo: true };

/**
 * El catálogo del maestro: qué hace y cuánto cobra.
 *
 * Los precios los pone él. La app no sugiere ni fija montos: hacerlo sería
 * tratarlo como empleado, y es independiente (Ley 21.431).
 */
export function MisServiciosScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const insets = useSafeAreaInsets();

  const [servicios, setServicios] = useState<ServicioCatalogo[]>([]);
  const [misOficios, setMisOficios] = useState<Oficio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Formulario: null = cerrado; número = editando ese servicio; 0 = creando.
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState(VACIO);
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [lista, perfil] = await Promise.all([
        api.catalogo.mios(token),
        api.perfilMaestro.obtener(token),
      ]);
      setServicios(lista);
      setMisOficios(perfil?.oficios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar tu catálogo.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function abrirNuevo() {
    setForm(VACIO);
    setOficio(misOficios[0] ?? null);
    setError('');
    setEditando(0);
  }

  function abrirEdicion(s: ServicioCatalogo) {
    setForm({
      titulo: s.titulo,
      descripcion: s.descripcion ?? '',
      precio: String(s.precio),
      unidad: s.unidad ?? '',
      precioFijo: s.precioFijo,
    });
    setOficio(s.oficio);
    setError('');
    setEditando(s.id);
  }

  async function guardar() {
    const precio = Number(form.precio.replace(/\D/g, ''));
    if (!form.titulo.trim()) {
      setError('Ponle un nombre al servicio.');
      return;
    }
    if (!oficio) {
      setError('Elige a qué oficio pertenece.');
      return;
    }
    if (!precio) {
      setError('Escribe cuánto cobras.');
      return;
    }
    const datos = {
      oficio,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      precio,
      precioFijo: form.precioFijo,
      unidad: form.unidad.trim() || null,
    };
    try {
      setGuardando(true);
      setError('');
      if (editando && editando > 0) {
        await api.catalogo.actualizar(token, editando, datos);
      } else {
        await api.catalogo.crear(token, datos);
      }
      setEditando(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el servicio.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(s: ServicioCatalogo) {
    // Optimista: el interruptor responde al toque y luego se confirma.
    setServicios((prev) => prev.map((x) => (x.id === s.id ? { ...x, activo: !x.activo } : x)));
    try {
      await api.catalogo.alternar(token, s.id);
    } catch {
      cargar();
    }
  }

  async function eliminar(id: number) {
    setServicios((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.catalogo.eliminar(token, id);
    } catch {
      cargar();
    }
  }

  const sinOficios = !cargando && misOficios.length === 0;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mis servicios</Text>
        <Text style={t.pequeno}>
          Publica lo que haces con tu precio. Los clientes lo ven en tu perfil y te lo piden
          directo.
        </Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={2} />
        </View>
      ) : sinOficios ? (
        <EmptyState
          icono="briefcase-outline"
          titulo="Primero tu perfil profesional"
          descripcion="Necesitas tener al menos un oficio en tu perfil para publicar servicios con precio."
          accion={{
            titulo: 'Ir a mi perfil',
            onPress: () => navigation.navigate('PerfilMaestro'),
          }}
        />
      ) : servicios.length === 0 ? (
        <EmptyState
          icono="pricetags-outline"
          titulo="Tu catálogo está vacío"
          descripcion="Un cliente que ve tu precio de antemano te contacta mucho más que uno que tiene que preguntar."
          accion={{ titulo: 'Publicar un servicio', onPress: abrirNuevo }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {servicios.map((s) => (
            <Card key={s.id}>
              <View style={[styles.filaTop, !s.activo && styles.pausado]}>
                <View style={{ flex: 1 }}>
                  <Text style={t.cuerpoFuerte}>{s.titulo}</Text>
                  <Text style={styles.oficio}>{NOMBRE_OFICIO[s.oficio] ?? s.oficio}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.precio}>
                    {s.precioFijo ? '' : 'desde '}
                    {formatearCLP(s.precio)}
                  </Text>
                  {!!s.unidad && <Text style={styles.unidad}>{s.unidad}</Text>}
                </View>
              </View>

              <View style={styles.chips}>
                <View style={[styles.chip, s.precioFijo ? styles.chipFirme : styles.chipDesde]}>
                  <Text
                    style={[
                      styles.chipTexto,
                      s.precioFijo ? styles.chipTextoFirme : styles.chipTextoDesde,
                    ]}>
                    {s.precioFijo ? 'Precio fijo' : 'Desde'}
                  </Text>
                </View>
                {!s.activo && (
                  <View style={[styles.chip, styles.chipPausado]}>
                    <Text style={[styles.chipTexto, styles.chipTextoPausado]}>Pausado</Text>
                  </View>
                )}
              </View>

              {!!s.descripcion && <Text style={styles.descripcion}>{s.descripcion}</Text>}

              <View style={styles.acciones}>
                <Pressable hitSlop={8} onPress={() => abrirEdicion(s)}>
                  <Text style={styles.enlace}>Editar</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => alternar(s)}>
                  <Text style={styles.enlace}>{s.activo ? 'Pausar' : 'Publicar'}</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => eliminar(s.id)}>
                  <Text style={styles.enlaceRojo}>Eliminar</Text>
                </Pressable>
              </View>
            </Card>
          ))}

          <View style={{ marginTop: espacio.sm }}>
            <Boton titulo="Publicar un servicio" variante="secundario" icono="add" onPress={abrirNuevo} />
          </View>
        </ScrollView>
      )}

      {/* Formulario en hoja inferior */}
      <Modal visible={editando !== null} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        {/* Sin esto el teclado tapa la hoja completa y escribes a ciegas. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalFondo} onPress={() => setEditando(null)}>
          <Pressable
            style={[styles.hoja, { paddingBottom: espacio.xl + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.asa} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[t.h2, styles.hojaTitulo]}>
                {editando && editando > 0 ? 'Editar servicio' : 'Nuevo servicio'}
              </Text>

              <CampoTexto
                etiqueta="¿Qué haces?"
                value={form.titulo}
                onChangeText={(v) => setForm({ ...form, titulo: v })}
                placeholder="Cambio de enchufe, destape de lavaplatos…"
                maxLength={80}
              />

              {/* Solo sus oficios: publicar uno ajeno sería ofrecer algo en lo
                  que nadie lo verificó. */}
              <Text style={styles.etiquetaGrupo}>Oficio</Text>
              <View style={styles.chipsOficio}>
                {misOficios.map((o) => (
                  <Pressable
                    key={o}
                    onPress={() => setOficio(o)}
                    style={[styles.chipOficio, oficio === o && styles.chipOficioActivo]}>
                    <Text style={[styles.chipOficioTexto, oficio === o && styles.chipOficioTextoActivo]}>
                      {NOMBRE_OFICIO[o] ?? o}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <CampoTexto
                etiqueta="Precio"
                value={form.precio}
                onChangeText={(v) => setForm({ ...form, precio: v.replace(/\D/g, '') })}
                placeholder="25000"
                keyboardType="number-pad"
                icono="cash-outline"
              />

              <CampoTexto
                etiqueta="Unidad (opcional)"
                value={form.unidad}
                onChangeText={(v) => setForm({ ...form, unidad: v })}
                placeholder="por punto, la hora, por m²…"
                maxLength={30}
              />

              {/* La decisión que más importa: define si el cliente ve un precio
                  firme o un piso. */}
              <Text style={styles.etiquetaGrupo}>¿Ese precio es firme?</Text>
              <ModoPrecio
                elegido={form.precioFijo}
                valor
                titulo="Sí, precio fijo"
                ayuda="Te comprometes a ese monto. El cliente lo pide y queda cotizado al tiro, sin que tengas que responder."
                onPress={() => setForm({ ...form, precioFijo: true })}
              />
              <ModoPrecio
                elegido={form.precioFijo}
                valor={false}
                titulo="No, es un “desde”"
                ayuda="Es tu piso. El cliente te lo pide y tú cotizas el precio real cuando veas el detalle."
                onPress={() => setForm({ ...form, precioFijo: false })}
              />

              <CampoTexto
                etiqueta="Qué incluye (opcional)"
                value={form.descripcion}
                onChangeText={(v) => setForm({ ...form, descripcion: v })}
                placeholder="Materiales incluidos, garantía, qué no cubre…"
                multiline
                maxLength={500}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
              <View style={{ height: espacio.xs }} />
              <Boton titulo="Cancelar" variante="terciario" onPress={() => setEditando(null)} />
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/** Una de las dos formas de cobrar, con su explicación al lado. */
function ModoPrecio({
  elegido,
  valor,
  titulo,
  ayuda,
  onPress,
}: {
  elegido: boolean;
  valor: boolean;
  titulo: string;
  ayuda: string;
  onPress: () => void;
}) {
  const activo = elegido === valor;
  return (
    <Pressable onPress={onPress} style={[styles.modo, activo && styles.modoActivo]}>
      <Icono
        nombre={activo ? 'radio-button-on' : 'radio-button-off'}
        tamano="md"
        color={activo ? colores.primario : colores.textoTenue}
      />
      <View style={{ flex: 1 }}>
        <Text style={t.pequenoFuerte}>{titulo}</Text>
        <Text style={styles.modoAyuda}>{ayuda}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  filaTop: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.sm },
  pausado: { opacity: 0.55 },
  oficio: { ...t.etiqueta, color: colores.primario, marginTop: 2 },
  precio: { ...t.h3, color: colores.texto },
  unidad: { ...t.etiqueta, color: colores.textoSuave },
  chips: { flexDirection: 'row', gap: espacio.xs, marginTop: espacio.xs },
  chip: { borderRadius: radio.completo, paddingHorizontal: espacio.sm, paddingVertical: 2 },
  chipFirme: { backgroundColor: colores.exitoFondo },
  chipDesde: { backgroundColor: colores.alertaFondo },
  chipPausado: { backgroundColor: colores.fondo, borderWidth: 1, borderColor: colores.borde },
  chipTexto: { ...t.etiqueta, fontWeight: '700' },
  chipTextoFirme: { color: colores.exitoTexto },
  chipTextoDesde: { color: colores.alertaTexto },
  chipTextoPausado: { color: colores.textoSuave },
  descripcion: { ...t.pequeno, marginTop: espacio.xs },
  acciones: {
    flexDirection: 'row',
    gap: espacio.md,
    marginTop: espacio.sm,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  enlace: { ...t.pequenoFuerte, color: colores.primario },
  enlaceRojo: { ...t.pequenoFuerte, color: colores.error },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    padding: margenPantalla,
    maxHeight: '90%',
  },
  asa: {
    width: 40,
    height: 4,
    borderRadius: radio.completo,
    backgroundColor: colores.bordeFuerte,
    alignSelf: 'center',
    marginBottom: espacio.md,
  },
  hojaTitulo: { marginBottom: espacio.md },
  etiquetaGrupo: { ...t.pequenoFuerte, marginBottom: espacio.xs },
  chipsOficio: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs, marginBottom: espacio.md },
  chipOficio: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingHorizontal: espacio.sm + 2,
    paddingVertical: espacio.xs,
  },
  chipOficioActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipOficioTexto: { ...t.pequeno, color: colores.texto },
  chipOficioTextoActivo: { color: colores.blanco, fontWeight: '700' },
  modo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espacio.sm,
    marginBottom: espacio.xs,
  },
  modoActivo: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  modoAyuda: { ...t.etiqueta, color: colores.textoSuave, marginTop: 2 },
});
