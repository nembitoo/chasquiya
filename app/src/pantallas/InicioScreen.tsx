import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { MaestroCercano, Solicitud } from '../api/tipos';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { AvatarUsuario } from '../componentes/base/AvatarUsuario';
import { ICONO_OFICIO, Icono, NombreIcono } from '../componentes/base/Icono';
import { Campanita } from '../componentes/dominio/Campanita';
import { TarjetaMaestro } from '../componentes/dominio/TarjetaMaestro';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, sombra, texto as t } from '../tema/tema';

type Props = TabProps<'Inicio'>;

export function InicioScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const rol = sesion?.rol;
  const token = sesion?.token ?? '';

  const [cercanos, setCercanos] = useState<MaestroCercano[]>([]);
  const [recientes, setRecientes] = useState<Solicitud[]>([]);
  const [comuna, setComuna] = useState('');
  const [cargando, setCargando] = useState(rol === 'CLIENTE');

  const cargar = useCallback(async () => {
    if (rol !== 'CLIENTE') return;
    // Cada bloque falla por su cuenta: si no hay GPS igual se ven los servicios.
    try {
      const principal = (await api.direcciones.mias(token)).find((d) => d.esPrincipal);
      if (principal?.comuna) setComuna(principal.comuna);
    } catch {
      /* sin direcciones guardadas */
    }
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.granted) {
        const pos = await Location.getCurrentPositionAsync({});
        setCercanos(
          (await api.descubrimiento.buscar(token, pos.coords.latitude, pos.coords.longitude, {})).slice(0, 5),
        );
      }
    } catch {
      /* sin ubicación: la sección simplemente no aparece */
    }
    try {
      setRecientes((await api.solicitudes.mias(token)).slice(0, 3));
    } catch {
      /* sin servicios todavía */
    }
    setCargando(false);
  }, [rol, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Saludo */}
        <View style={styles.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saludo}>Hola, {sesion?.nombre} 👋</Text>
            <Text style={t.pequeno}>
              {rol === 'MAESTRO'
                ? 'Revisa tus solicitudes del día'
                : rol === 'ADMIN'
                  ? 'Resumen de la plataforma'
                  : '¿Qué necesitas arreglar hoy?'}
            </Text>
            {rol === 'CLIENTE' && !!comuna && (
              <View style={styles.ubicacion}>
                <Icono nombre="location" tamano="sm" color={colores.primario} />
                <Text style={styles.ubicacionTexto}>{comuna}</Text>
              </View>
            )}
          </View>
          <Campanita />
          <AvatarUsuario
            usuarioId={sesion?.id}
            nombre={sesion?.nombre}
            tieneAvatar={sesion?.tieneAvatar}
            tamano={44}
          />
        </View>

        {rol === 'CLIENTE' && (
          <>
            {/* Buscador (lleva a la pestaña Buscar) */}
            <Pressable style={styles.buscador} onPress={() => navigation.navigate('Buscar')}>
              <Icono nombre="search" tamano="md" color={colores.textoTenue} />
              <Text style={styles.buscadorTexto}>¿Qué servicio necesitas?</Text>
            </Pressable>

            {/* Categorías */}
            <Text style={[t.h3, styles.tituloSeccion]}>Categorías</Text>
            <View style={styles.grilla}>
              {OFICIOS.slice(0, 8).map((o) => (
                <Pressable
                  key={o.valor}
                  style={({ pressed }) => [styles.categoria, pressed && styles.presionado]}
                  onPress={() => navigation.navigate('Buscar')}>
                  <View style={styles.categoriaIcono}>
                    <Icono
                      nombre={(ICONO_OFICIO[o.valor] ?? 'ellipsis-horizontal') as NombreIcono}
                      tamano="lg"
                      color={colores.primario}
                    />
                  </View>
                  <Text style={styles.categoriaTexto} numberOfLines={1}>
                    {o.etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Maestros cercanos */}
            {cargando ? (
              <SkeletonLista cantidad={2} />
            ) : (
              cercanos.length > 0 && (
                <>
                  <View style={styles.filaSeccion}>
                    <Text style={[t.h3, { flex: 1 }]}>Cerca de ti</Text>
                    <Pressable onPress={() => navigation.navigate('Buscar')} hitSlop={8}>
                      <Text style={styles.verTodo}>Ver todos</Text>
                    </Pressable>
                  </View>
                  {cercanos.map((m) => (
                    <TarjetaMaestro
                      key={m.usuarioId}
                      maestro={m}
                      onPress={() => navigation.navigate('MaestroPublico', { usuarioId: m.usuarioId })}
                    />
                  ))}
                </>
              )
            )}

            {/* Servicios recientes */}
            {recientes.length > 0 && (
              <>
                <View style={styles.filaSeccion}>
                  <Text style={[t.h3, { flex: 1 }]}>Tus servicios recientes</Text>
                  <Pressable onPress={() => navigation.navigate('MisSolicitudes')} hitSlop={8}>
                    <Text style={styles.verTodo}>Ver todos</Text>
                  </Pressable>
                </View>
                {recientes.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => navigation.navigate('MisSolicitudes')}
                    style={({ pressed }) => [styles.reciente, pressed && styles.presionado]}>
                    <View style={styles.accesoIcono}>
                      <Icono
                        nombre={(ICONO_OFICIO[s.oficio] ?? 'ellipsis-horizontal') as NombreIcono}
                        tamano="lg"
                        color={colores.primario}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={t.cuerpoFuerte} numberOfLines={1}>
                        {s.maestroNombre}
                      </Text>
                      <Text style={t.pequeno} numberOfLines={1}>
                        {s.descripcion}
                      </Text>
                    </View>
                    <EstadoBadge estado={s.estado} />
                  </Pressable>
                ))}
              </>
            )}

            <AccesoRapido
              icono="search"
              titulo="Buscar maestros cerca de ti"
              descripcion="Filtra por oficio y distancia"
              onPress={() => navigation.navigate('Buscar')}
            />
            <AccesoRapido
              icono="briefcase"
              titulo="Mis servicios"
              descripcion="Sigue el estado de tus solicitudes"
              onPress={() => navigation.navigate('MisSolicitudes')}
            />
          </>
        )}

        {rol === 'MAESTRO' && (
          <>
            <AccesoRapido
              icono="file-tray-full"
              titulo="Solicitudes recibidas"
              descripcion="Cotiza y gestiona tus trabajos"
              onPress={() => navigation.navigate('SolicitudesRecibidas')}
            />
            <AccesoRapido
              icono="cash"
              titulo="Mis ingresos"
              descripcion="Revisa lo que has ganado"
              onPress={() => navigation.navigate('Ingresos')}
            />
            <AccesoRapido
              icono="briefcase"
              titulo="Mi perfil profesional"
              descripcion="Oficios, tarifas y documentos"
              onPress={() => navigation.navigate('PerfilMaestro')}
            />
          </>
        )}

        {rol === 'ADMIN' && (
          <>
            <AccesoRapido
              icono="shield-checkmark"
              titulo="Maestros pendientes"
              descripcion="Aprueba o rechaza perfiles"
              onPress={() => navigation.navigate('Admin')}
            />
            <AccesoRapido
              icono="alert-circle"
              titulo="Disputas abiertas"
              descripcion="Media entre clientes y maestros"
              onPress={() => navigation.navigate('AdminDisputas')}
            />
            <Text style={styles.nota}>
              El panel completo con métricas está en el backoffice web.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccesoRapido({
  icono,
  titulo,
  descripcion,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  descripcion: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.acceso, pressed && styles.presionado]} onPress={onPress}>
      <View style={styles.accesoIcono}>
        <Icono nombre={icono} tamano="lg" color={colores.primario} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={t.cuerpoFuerte}>{titulo}</Text>
        <Text style={t.pequeno}>{descripcion}</Text>
      </View>
      <Icono nombre="chevron-forward" tamano="md" color={colores.textoTenue} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  scroll: { padding: margenPantalla, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginBottom: espacio.lg },
  saludo: { ...t.h2 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    height: 52,
    marginBottom: espacio.lg,
    ...sombra.nivel1,
  },
  buscadorTexto: { ...t.cuerpo, color: colores.textoTenue },
  tituloSeccion: { marginBottom: espacio.sm },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginBottom: espacio.lg },
  categoria: { width: '22%', alignItems: 'center', gap: espacio.xxs },
  categoriaIcono: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radio.md,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriaTexto: { ...t.etiqueta, textAlign: 'center' },
  acceso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    ...sombra.nivel1,
  },
  accesoIcono: {
    width: 44,
    height: 44,
    borderRadius: radio.sm,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.7 },
  nota: { ...t.etiqueta, textAlign: 'center', marginTop: espacio.md },
  ubicacion: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  ubicacionTexto: { ...t.pequenoFuerte, color: colores.primario },
  filaSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.sm },
  verTodo: { ...t.pequenoFuerte, color: colores.primario },
  reciente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
});
