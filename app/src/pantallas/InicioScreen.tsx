import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { MaestroCercano, Solicitud } from '../api/tipos';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { Estrellas } from '../componentes/Estrellas';
import { AvatarUsuario } from '../componentes/base/AvatarUsuario';
import { ICONO_OFICIO, Icono, NombreIcono } from '../componentes/base/Icono';
import { Campanita } from '../componentes/dominio/Campanita';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { COLOR_OFICIO, NOMBRE_OFICIO, OFICIOS } from '../datos/oficios';
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
  const insets = useSafeAreaInsets();

  /*
   * El degradado pasa por detras de la barra de estado, asi que sus iconos
   * tienen que ir en claro. Se devuelve a oscuro al salir de Inicio: las
   * pestanas quedan montadas y si no, en Buscar los iconos se volverian
   * invisibles sobre el fondo blanco.
   */
  useFocusEffect(
    useCallback(() => {
      if (rol !== 'CLIENTE') return;
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [rol]),
  );

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

  // El cliente no lleva borde superior: el degradado tiene que llegar al borde
  // de la pantalla, y el espacio de la barra de estado lo pone el degradado.
  return (
    <SafeAreaView style={styles.contenedor} edges={rol === 'CLIENTE' ? [] : ['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Saludo. Para el cliente va sobre un degradado que sangra a los
            bordes; para los demas roles se mantiene sobre el fondo claro. */}
        <Envoltura degradado={rol === 'CLIENTE'} alturaBarra={insets.top}>
          <View style={styles.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.saludo, rol === 'CLIENTE' && styles.textoSobreColor]}>
              Hola, {sesion?.nombre} 👋
            </Text>
            <Text style={[t.pequeno, rol === 'CLIENTE' && styles.subtituloSobreColor]}>
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
          <Campanita color={rol === 'CLIENTE' ? colores.textoInverso : colores.texto} />
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
        </Envoltura>

        {rol === 'CLIENTE' && (
          <>
            {/* Publicar arriba del todo: es la accion principal del cliente y
                antes vivia enterrada al final de la pantalla. */}
            <Pressable
              style={styles.publicar}
              onPress={() => navigation.navigate('PublicarSolicitud')}>
              <View style={styles.publicarIcono}>
                <Icono nombre="megaphone" tamano="lg" color={colores.primario} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.publicarTitulo}>Publicar un trabajo</Text>
                <Text style={styles.publicarTexto}>
                  Cuéntanos qué necesitas y varios maestros te cotizan.
                </Text>
              </View>
              <Icono nombre="chevron-forward" tamano="md" color={colores.primario} />
            </Pressable>

            {/* Buscador (lleva a la pestaña Buscar) */}
            <Pressable style={styles.buscador} onPress={() => navigation.navigate('Buscar')}>
              <Icono nombre="search" tamano="md" color={colores.textoTenue} />
              <Text style={styles.buscadorTexto}>Buscar servicio o maestro</Text>
            </Pressable>

            {/* Categorias: cuatro, no ocho. Con ocho ninguna se lee. */}
            <View style={styles.filaSeccion}>
              <Text style={[t.h3, { flex: 1 }]}>Explora categorías</Text>
              <Pressable onPress={() => navigation.navigate('Buscar')} hitSlop={8}>
                <Text style={styles.verTodo}>Ver todas</Text>
              </Pressable>
            </View>
            <View style={styles.grilla}>
              {OFICIOS.slice(0, 4).map((o) => (
                <Pressable
                  key={o.valor}
                  style={({ pressed }) => [styles.categoria, pressed && styles.presionado]}
                  onPress={() => navigation.navigate('Buscar')}>
                  <View
                    style={[styles.categoriaIcono, { backgroundColor: COLOR_OFICIO[o.valor].fondo }]}>
                    <Icono
                      nombre={(ICONO_OFICIO[o.valor] ?? 'ellipsis-horizontal') as NombreIcono}
                      tamano="lg"
                      color={COLOR_OFICIO[o.valor].icono}
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
                    <Text style={[t.h3, { flex: 1 }]}>Recomendados para ti</Text>
                    <Pressable onPress={() => navigation.navigate('Buscar')} hitSlop={8}>
                      <Text style={styles.verTodo}>Ver todos</Text>
                    </Pressable>
                  </View>
                  {cercanos.map((m) => (
                    <FilaMaestro
                      key={m.usuarioId}
                      maestro={m}
                      onPress={() => navigation.navigate('MaestroPublico', { usuarioId: m.usuarioId })}
                      onContactar={() =>
                        navigation.navigate('NuevaSolicitud', {
                          maestroId: m.usuarioId,
                          maestroNombre: `${m.nombre} ${m.apellido}`,
                          oficios: m.oficios,
                        })
                      }
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

/**
 * Pinta el degradado detras de la cabecera del cliente.
 *
 * Los margenes negativos son para que el color llegue a los bordes: el
 * contenido del scroll vive con padding, y sin esto quedaria una franja de
 * fondo claro a cada lado.
 */
function Envoltura({
  degradado,
  alturaBarra,
  children,
}: {
  degradado: boolean;
  alturaBarra: number;
  children: React.ReactNode;
}) {
  if (!degradado) {
    return <>{children}</>;
  }
  return (
    <LinearGradient
      colors={[colores.primario, colores.primarioActivo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.degradado, { paddingTop: alturaBarra + espacio.md }]}>
      {children}
    </LinearGradient>
  );
}

/**
 * Maestro en el home: fila compacta, con Contactar a la derecha.
 *
 * En Buscar se usa la tarjeta grande, que muestra precio y servicio. Aqui la
 * lista es un aperitivo -tres nombres- y una tarjeta por cada uno ocupaba media
 * pantalla.
 */
function FilaMaestro({
  maestro,
  onPress,
  onContactar,
}: {
  maestro: MaestroCercano;
  onPress: () => void;
  onContactar: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.filaMaestro, pressed && styles.presionado]}>
      <AvatarUsuario
        usuarioId={maestro.usuarioId}
        nombre={`${maestro.nombre} ${maestro.apellido}`}
        tieneAvatar={maestro.tieneAvatar}
        tamano={48}
      />
      <View style={{ flex: 1 }}>
        <Text style={t.cuerpoFuerte} numberOfLines={1}>
          {maestro.nombre} {maestro.apellido}
        </Text>
        <Estrellas valor={maestro.calificacionPromedio} cantidad={maestro.cantidadCalificaciones} />
        <Text style={styles.filaMaestroOficio} numberOfLines={1}>
          {maestro.oficios.map((o) => NOMBRE_OFICIO[o] ?? o).join(' · ')}
          {maestro.distanciaKm > 0 ? ` · a ${maestro.distanciaKm} km` : ''}
        </Text>
      </View>
      <Pressable
        onPress={onContactar}
        accessibilityRole="button"
        style={({ pressed }) => [styles.contactar, pressed && styles.presionado]}>
        <Text style={styles.contactarTexto}>Contactar</Text>
      </Pressable>
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
  degradado: {
    marginHorizontal: -margenPantalla,
    marginTop: -margenPantalla,
    paddingHorizontal: margenPantalla,
    /* Sobra alto a proposito: la tarjeta de publicar se monta sobre este borde,
       como en la referencia. */
    paddingBottom: espacio.xl + espacio.lg,
    borderBottomLeftRadius: radio.xl,
    borderBottomRightRadius: radio.xl,
  },
  textoSobreColor: { color: colores.textoInverso },
  filaMaestro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.sm + 2,
    marginBottom: espacio.sm,
  },
  filaMaestroOficio: { ...t.etiqueta, color: colores.textoSuave },
  contactar: {
    backgroundColor: colores.primario,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs + 2,
  },
  contactarTexto: { ...t.pequenoFuerte, color: colores.textoInverso },
  subtituloSobreColor: { color: 'rgba(255,255,255,0.85)' },

  /* --- Publicar un trabajo, la accion principal del cliente --- */
  publicar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    padding: espacio.md,
    /* Negativo: sube la tarjeta para que pise el borde del degradado. */
    marginTop: -(espacio.xl + espacio.xs),
    marginBottom: espacio.md,
    ...sombra.nivel2,
  },
  publicarIcono: {
    width: 48,
    height: 48,
    borderRadius: radio.completo,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicarTitulo: { ...t.cuerpoFuerte },
  publicarTexto: { ...t.etiqueta, color: colores.textoSuave, marginTop: 2 },

  /* --- Tarjeta destacada del maestro --- */
  destacada: {
    /* La ilustracion viene con fondo transparente, asi que la tarjeta puede
       usar el rosa del sistema sin que se vea el recorte. */
    backgroundColor: colores.primarioSuave,
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
