import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Direccion } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { Card } from '../componentes/base/Card';
import { Icono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Direcciones'>;

const VACIO = { etiqueta: '', direccion: '', comuna: '', referencia: '' };

export function DireccionesScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Formulario: null = cerrado; número = editando esa dirección; 0 = creando.
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDirecciones(await api.direcciones.mias(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus direcciones.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function abrirNueva() {
    setForm(VACIO);
    setEditando(0);
  }

  function abrirEdicion(d: Direccion) {
    setForm({
      etiqueta: d.etiqueta,
      direccion: d.direccion,
      comuna: d.comuna ?? '',
      referencia: d.referencia ?? '',
    });
    setEditando(d.id);
  }

  async function guardar() {
    setError('');
    if (!form.etiqueta.trim() || !form.direccion.trim()) {
      setError('El nombre y la dirección son obligatorios.');
      return;
    }
    const datos = {
      etiqueta: form.etiqueta.trim(),
      direccion: form.direccion.trim(),
      comuna: form.comuna.trim() || null,
      referencia: form.referencia.trim() || null,
      esPrincipal: false,
    };
    try {
      setGuardando(true);
      if (editando && editando > 0) {
        await api.direcciones.actualizar(token, editando, datos);
      } else {
        await api.direcciones.crear(token, datos);
      }
      setEditando(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la dirección.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: number) {
    setDirecciones((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.direcciones.eliminar(token, id);
      await cargar();
    } catch {
      cargar();
    }
  }

  async function hacerPrincipal(d: Direccion) {
    try {
      await api.direcciones.actualizar(token, d.id, {
        etiqueta: d.etiqueta,
        direccion: d.direccion,
        comuna: d.comuna,
        referencia: d.referencia,
        esPrincipal: true,
      });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la principal.');
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mis direcciones</Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={2} />
        </View>
      ) : direcciones.length === 0 ? (
        <EmptyState
          icono="location-outline"
          titulo="Sin direcciones guardadas"
          descripcion="Guarda tus direcciones habituales para no escribirlas cada vez que solicites un servicio."
          accion={{ titulo: 'Agregar dirección', onPress: abrirNueva }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {direcciones.map((d) => (
            <Card key={d.id}>
              <View style={styles.filaTop}>
                <View style={styles.iconoCaja}>
                  <Icono nombre={iconoDe(d.etiqueta)} tamano="md" color={colores.primario} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.filaEtiqueta}>
                    <Text style={t.cuerpoFuerte}>{d.etiqueta}</Text>
                    {d.esPrincipal && (
                      <View style={styles.chipPrincipal}>
                        <Text style={styles.chipPrincipalTexto}>Principal</Text>
                      </View>
                    )}
                  </View>
                  <Text style={t.pequeno}>{d.direccion}</Text>
                  {!!d.comuna && <Text style={t.pequeno}>{d.comuna}</Text>}
                  {!!d.referencia && <Text style={styles.referencia}>{d.referencia}</Text>}
                </View>
              </View>

              <View style={styles.acciones}>
                <Pressable hitSlop={8} onPress={() => abrirEdicion(d)}>
                  <Text style={styles.enlace}>Editar</Text>
                </Pressable>
                {!d.esPrincipal && (
                  <>
                    <Pressable hitSlop={8} onPress={() => hacerPrincipal(d)}>
                      <Text style={styles.enlace}>Hacer principal</Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => eliminar(d.id)}>
                      <Text style={styles.enlaceRojo}>Eliminar</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </Card>
          ))}

          <View style={{ marginTop: espacio.sm }}>
            <Boton titulo="Agregar dirección" variante="secundario" icono="add" onPress={abrirNueva} />
          </View>
        </ScrollView>
      )}

      {/* Formulario en hoja inferior */}
      <Modal visible={editando !== null} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        <Pressable style={styles.modalFondo} onPress={() => setEditando(null)}>
          <Pressable style={styles.hoja} onPress={(e) => e.stopPropagation()}>
            <View style={styles.asa} />
            <Text style={[t.h2, styles.hojaTitulo]}>
              {editando && editando > 0 ? 'Editar dirección' : 'Nueva dirección'}
            </Text>

            <CampoTexto
              etiqueta="Nombre"
              value={form.etiqueta}
              onChangeText={(v) => setForm({ ...form, etiqueta: v })}
              placeholder="Casa, Trabajo, Depto de mamá…"
            />
            <CampoTexto
              etiqueta="Dirección"
              value={form.direccion}
              onChangeText={(v) => setForm({ ...form, direccion: v })}
              placeholder="Calle y número"
              icono="location-outline"
            />
            <CampoTexto
              etiqueta="Comuna"
              value={form.comuna}
              onChangeText={(v) => setForm({ ...form, comuna: v })}
            />
            <CampoTexto
              etiqueta="Referencia (opcional)"
              value={form.referencia}
              onChangeText={(v) => setForm({ ...form, referencia: v })}
              placeholder="Portón negro, timbre 2"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
            <View style={{ height: espacio.xs }} />
            <Boton titulo="Cancelar" variante="terciario" onPress={() => setEditando(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/** Icono según cómo llamó el usuario a la dirección. */
function iconoDe(etiqueta: string) {
  const e = etiqueta.toLowerCase();
  if (e.includes('casa') || e.includes('hogar')) return 'home' as const;
  if (e.includes('trabajo') || e.includes('oficina')) return 'business' as const;
  return 'location' as const;
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  filaTop: { flexDirection: 'row', gap: espacio.sm },
  iconoCaja: {
    width: 40,
    height: 40,
    borderRadius: radio.sm,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  chipPrincipal: {
    backgroundColor: colores.exitoFondo,
    paddingHorizontal: espacio.xs,
    paddingVertical: 2,
    borderRadius: radio.completo,
  },
  chipPrincipalTexto: { ...t.etiqueta, color: colores.exitoTexto, fontWeight: '700' },
  referencia: { ...t.etiqueta, fontStyle: 'italic', marginTop: 2 },
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
    paddingBottom: espacio.xl,
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
});
