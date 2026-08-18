import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

/** Lo mas urgente que le conviene hacer al maestro. `ir` null = solo informa. */
type Consejo = {
  texto: string;
  accion: string | null;
  ir: 'PerfilMaestro' | 'MisServicios' | null;
};

export function InicioScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const rol = sesion?.rol;
  const token = sesion?.token ?? '';

  const [cercanos, setCercanos] = useState<MaestroCercano[]>([]);
  const [recientes, setRecientes] = useState<Solicitud[]>([]);
  const [comuna, setComuna] = useState('');
  const [cargando, setCargando] = useState(rol === 'CLIENTE');

  /** Los tres numeros que le importan al maestro al abrir la app. */
  const [resumen, setResumen] = useState({ disponibles: 0, enCurso: 0, promedio: 0 });
  const [consejo, setConsejo] = useState<Consejo | null>(null);

  /**
   * Que le conviene hacer ahora al maestro. Uno solo, el mas urgente, y si no
   * hay nada pendiente la tarjeta no aparece: un consejo fijo que dice
   * "completa tu perfil" cuando ya lo completaste es ruido.
   */
  const cargarConsejo = useCallback(async () => {
    const perfil = await api.perfilMaestro.obtener(token).catch(() => null);
    if (!perfil) {
      setConsejo({ texto: 'Crea tu perfil profesional para poder recibir trabajos.', accion: 'Crear perfil', ir: 'PerfilMaestro' });
      return;
    }
    const documentos = await api.documentos.mios(token).catch(() => []);
    if (documentos.length === 0) {
      setConsejo({ texto: 'Sube tus documentos para que podamos verificarte.', accion: 'Subir', ir: 'PerfilMaestro' });
      return;
    }
    if (perfil.estadoVerificacion === 'PENDIENTE') {
      setConsejo({ texto: 'Tu perfil esta en revision. Te avisamos apenas haya novedades.', accion: null, ir: null });
      return;
    }
    const catalogo = await api.catalogo.mios(token).catch(() => []);
    if (catalogo.filter((c) => c.activo).length === 0) {
      setConsejo({ texto: 'Publica tus servicios con precio: sin catalogo no apareces en las busquedas.', accion: 'Publicar', ir: 'MisServicios' });
      return;
    }
    setConsejo(null);
  }, [token]);

  const cargarMaestro = useCallback(async () => {
    const [abiertas, recibidas, reputacion] = await Promise.all([
      api.solicitudes.abiertas(token).catch(() => []),
      api.solicitudes.recibidas(token).catch(() => []),
      sesion?.id ? api.calificaciones.reputacionDe(token, sesion.id).catch(() => null) : null,
    ]);
    setResumen({
      disponibles: abiertas.length,
      enCurso: recibidas.filter((s) => s.estado === 'ACEPTADO' || s.estado === 'EN_CURSO').length,
      promedio: reputacion?.promedio ?? 0,
    });
    await cargarConsejo();
  }, [token, sesion?.id, cargarConsejo]);

  const cargar = useCallback(async () => {
    if (rol === 'MAESTRO') {
      await cargarMaestro();
      return;
    }
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
  }, [rol, token, cargarMaestro]);

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
          {/* El perfil dejo de ser una pestana: se abre desde aqui, como ventana. */}
          <Pressable
            onPress={() => navigation.navigate('Perfil')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Abrir mi perfil">
            <AvatarUsuario
              usuarioId={sesion?.id}
              nombre={sesion?.nombre}
              tieneAvatar={sesion?.tieneAvatar}
              tamano={44}
            />
          </Pressable>
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
              icono="megaphone"
              titulo="Publicar un trabajo"
              descripcion="Recibe varios precios y elige el que más te convenga"
              onPress={() => navigation.navigate('PublicarSolicitud')}
            />
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
            {/* Lo primero: cuanto trabajo hay esperandolo y como va */}
            <View style={styles.destacada}>
              <View style={styles.destacadaFila}>
                <View style={styles.destacadaTexto}>
                  <Text style={styles.destacadaEtiqueta}>
                    {resumen.disponibles > 0 ? '¡Sigue creciendo!' : 'Todo al día'}
                  </Text>
                  <Text style={styles.destacadaTitulo}>
                    {resumen.disponibles > 0
                      ? `Tienes ${resumen.disponibles} ${resumen.disponibles === 1 ? 'trabajo disponible' : 'trabajos disponibles'}`
                      : 'Sin trabajos nuevos por ahora'}
                  </Text>
                  <Pressable
                    style={styles.destacadaBoton}
                    onPress={() => navigation.navigate('SolicitudesRecibidas')}>
                    <Text style={styles.destacadaBotonTexto}>Ver solicitudes</Text>
                  </Pressable>
                </View>

                {/* La ilustracion trae su propio fondo rosado claro; la tarjeta
                    usa ese mismo tono para que no se vea donde termina la
                    imagen. */}
                <Image
                  source={require('../../assets/maestro-inicio.png')}
                  style={styles.destacadaImagen}
                  resizeMode="contain"
                />
              </View>

              {/* Abajo y a lo ancho: en un telefono no caben tres columnas, y
                  apretados "Calificacion" se partia por la mitad. */}
              <View style={styles.destacadaNumeros}>
                <Numero icono="briefcase" valor={String(resumen.enCurso)} etiqueta="Trabajos en curso" />
                <Numero
                  icono="star"
                  valor={resumen.promedio > 0 ? resumen.promedio.toFixed(1) : '—'}
                  etiqueta="Calificación promedio"
                />
              </View>
            </View>

            <View style={styles.grillaAccesos}>
              <TarjetaAcceso icono="file-tray-full" titulo="Solicitudes recibidas" descripcion="Cotiza y gestiona tus trabajos" onPress={() => navigation.navigate('SolicitudesRecibidas')} />
              <TarjetaAcceso icono="calendar" titulo="Mi agenda" descripcion="Los trabajos que aceptaste, por fecha" onPress={() => navigation.navigate('Agenda')} />
              <TarjetaAcceso icono="cash" titulo="Mis ingresos" descripcion="Revisa lo que has ganado" onPress={() => navigation.navigate('Ingresos')} />
              <TarjetaAcceso icono="star" titulo="Mis calificaciones" descripcion="Revisa las opiniones de tus clientes" onPress={() => navigation.navigate('MisCalificaciones')} />
              <TarjetaAcceso icono="pricetags" titulo="Mis servicios y precios" descripcion="Gestiona tus servicios y tarifas" onPress={() => navigation.navigate('MisServicios')} />
              <TarjetaAcceso icono="briefcase" titulo="Mi perfil profesional" descripcion="Oficios, zona y documentos" onPress={() => navigation.navigate('PerfilMaestro')} />
            </View>

            {/* Solo aparece si de verdad hay algo pendiente que hacer. */}
            {!!consejo && (
              <View style={styles.consejo}>
                <View style={styles.consejoIcono}>
                  <Icono nombre="trending-up" tamano="lg" color={colores.primario} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={t.cuerpoFuerte}>Consejo para hoy</Text>
                  <Text style={styles.consejoTexto}>{consejo.texto}</Text>
                </View>
                {!!consejo.accion && !!consejo.ir && (
                  <Pressable
                    style={styles.consejoBoton}
                    onPress={() => navigation.navigate(consejo.ir as 'PerfilMaestro' | 'MisServicios')}>
                    <Text style={styles.consejoBotonTexto}>{consejo.accion}</Text>
                    <Icono nombre="chevron-forward" tamano="sm" color={colores.primario} />
                  </Pressable>
                )}
              </View>
            )}
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

/** Un numero del resumen: valor grande arriba, que significa abajo. */
function Numero({ icono, valor, etiqueta }: { icono: NombreIcono; valor: string; etiqueta: string }) {
  return (
    <View style={styles.numero}>
      <View style={styles.numeroIcono}>
        <Icono nombre={icono} tamano="md" color={colores.primario} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.numeroValor}>{valor}</Text>
        <Text style={styles.numeroEtiqueta}>{etiqueta}</Text>
      </View>
    </View>
  );
}

/** Acceso de la grilla: media pantalla de ancho, para que entren dos por fila. */
function TarjetaAcceso({
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tarjetaAcceso, pressed && styles.tarjetaAccesoPresionada]}>
      <View style={styles.tarjetaAccesoIcono}>
        <Icono nombre={icono} tamano="lg" color={colores.primario} />
      </View>
      <Text style={styles.tarjetaAccesoTitulo} numberOfLines={2}>{titulo}</Text>
      <Text style={styles.tarjetaAccesoDescripcion} numberOfLines={2}>{descripcion}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  scroll: { padding: margenPantalla, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginBottom: espacio.lg },
  saludo: { ...t.h2 },

  /* --- Tarjeta destacada del maestro --- */
  destacada: {
    /* Este rosa sale del propio recorte de la ilustracion: si la tarjeta usara
       otro tono se veria el rectangulo de la imagen. */
    backgroundColor: '#FDF5F6',
    borderRadius: radio.lg,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  destacadaFila: { flexDirection: 'row', alignItems: 'center' },
  destacadaTexto: { flex: 1 },
  destacadaEtiqueta: { ...t.pequenoFuerte, color: colores.primario },
  destacadaTitulo: { ...t.h3, marginTop: 2, marginBottom: espacio.sm },
  destacadaBoton: {
    alignSelf: 'flex-start',
    backgroundColor: colores.primario,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  destacadaBotonTexto: { ...t.pequenoFuerte, color: colores.textoInverso },
  destacadaImagen: { width: 112, height: 138, marginRight: -espacio.xs },
  destacadaNumeros: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.sm },
  numero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    padding: espacio.sm,
    flex: 1,
  },
  numeroIcono: {
    width: 30,
    height: 30,
    borderRadius: radio.sm,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroValor: { ...t.h3 },
  numeroEtiqueta: { ...t.etiqueta, color: colores.textoSuave },

  /* --- Grilla de accesos --- */
  grillaAccesos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  tarjetaAcceso: {
    /* 48% y no 50%: el resto lo ocupa el `gap` entre columnas. */
    width: '48%',
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    ...sombra.nivel1,
  },
  tarjetaAccesoPresionada: { opacity: 0.7 },
  tarjetaAccesoIcono: {
    width: 40,
    height: 40,
    borderRadius: radio.sm,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.sm,
  },
  tarjetaAccesoTitulo: { ...t.cuerpoFuerte },
  tarjetaAccesoDescripcion: { ...t.etiqueta, color: colores.textoSuave, marginTop: 2 },

  /* --- Consejo --- */
  consejo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.md,
    padding: espacio.md,
    marginTop: espacio.md,
  },
  consejoIcono: {
    width: 44,
    height: 44,
    borderRadius: radio.completo,
    backgroundColor: colores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consejoTexto: { ...t.etiqueta, color: colores.textoSuave, marginTop: 2 },
  consejoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colores.superficie,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.sm,
    paddingVertical: espacio.xs,
  },
  consejoBotonTexto: { ...t.pequenoFuerte, color: colores.primario },
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
