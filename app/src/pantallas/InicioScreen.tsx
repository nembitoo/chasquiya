import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../componentes/base/Avatar';
import { ICONO_OFICIO, Icono, NombreIcono } from '../componentes/base/Icono';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, sombra, texto as t } from '../tema/tema';

type Props = TabProps<'Inicio'>;

export function InicioScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const rol = sesion?.rol;

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
          </View>
          <Avatar nombre={sesion?.nombre} tamano={44} />
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
                    {o.etiqueta.replace(/^\S+\s/, '')}
                  </Text>
                </Pressable>
              ))}
            </View>

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
});
