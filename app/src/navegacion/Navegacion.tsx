import { BottomTabScreenProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackScreenProps, createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Oficio } from '../api/tipos';
import { Icono, NombreIcono } from '../componentes/base/Icono';
import { useAuth } from '../estado/AuthContext';
import { AdminDisputasScreen } from '../pantallas/AdminDisputasScreen';
import { AdminMaestrosScreen } from '../pantallas/AdminMaestrosScreen';
import { BienvenidaScreen } from '../pantallas/BienvenidaScreen';
import { BuscarScreen } from '../pantallas/BuscarScreen';
import { CalificarScreen } from '../pantallas/CalificarScreen';
import { ChatScreen } from '../pantallas/ChatScreen';
import { ChatsScreen } from '../pantallas/ChatsScreen';
import { DireccionesScreen } from '../pantallas/DireccionesScreen';
import { FavoritosScreen } from '../pantallas/FavoritosScreen';
import { IngresosScreen } from '../pantallas/IngresosScreen';
import { LegalScreen } from '../pantallas/LegalScreen';
import { InicioScreen } from '../pantallas/InicioScreen';
import { LoginScreen } from '../pantallas/LoginScreen';
import { MaestroPublicoScreen } from '../pantallas/MaestroPublicoScreen';
import { MisDatosScreen } from '../pantallas/MisDatosScreen';
import { MisSolicitudesScreen } from '../pantallas/MisSolicitudesScreen';
import { NotificacionesScreen } from '../pantallas/NotificacionesScreen';
import { NuevaSolicitudScreen } from '../pantallas/NuevaSolicitudScreen';
import { PagoScreen } from '../pantallas/PagoScreen';
import { PerfilMaestroScreen } from '../pantallas/PerfilMaestroScreen';
import { PerfilScreen } from '../pantallas/PerfilScreen';
import { PrivacidadScreen } from '../pantallas/PrivacidadScreen';
import { RecuperarScreen } from '../pantallas/RecuperarScreen';
import { RegistroScreen } from '../pantallas/RegistroScreen';
import { SolicitudesRecibidasScreen } from '../pantallas/SolicitudesRecibidasScreen';
import { colores, fuentes } from '../tema/tema';

/** Pantallas de la pila: acceso y detalles que se abren "encima" de las pestañas. */
export type RootStackParamList = {
  Bienvenida: undefined;
  Registro: undefined;
  Login: undefined;
  Recuperar: undefined;
  /** Permite navegar a una pestaña concreta: navigate('Tabs', { screen: 'MisSolicitudes' }) */
  Tabs: NavigatorScreenParams<TabParamList>;
  Chat: { solicitudId: number; contraparteNombre: string };
  MaestroPublico: { usuarioId: number };
  NuevaSolicitud: {
    maestroId: number;
    maestroNombre: string;
    oficios: Oficio[];
    /** Datos de un servicio anterior, para "volver a contratar". */
    precargar?: { descripcion: string; direccion: string };
  };
  Pago: { solicitudId: number };
  Calificar: { solicitudId: number; contraparteNombre: string; esMaestro: boolean };
  PerfilMaestro: undefined;
  Favoritos: undefined;
  MisDatos: undefined;
  Direcciones: undefined;
  Notificaciones: undefined;
  Privacidad: undefined;
  Legal: { inicial?: 'terminos' | 'privacidad' } | undefined;
};

/** Pestañas inferiores. Cada rol ve un subconjunto. */
export type TabParamList = {
  Inicio: undefined;
  Buscar: undefined;
  MisSolicitudes: undefined;
  SolicitudesRecibidas: undefined;
  Ingresos: undefined;
  Admin: undefined;
  AdminDisputas: undefined;
  Chats: undefined;
  Perfil: undefined;
};

/** Props de una pantalla que vive en una pestaña (puede navegar también a la pila). */
export type TabProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** Icono de cada pestaña: relleno cuando está activa, contorno cuando no. */
function iconoPestana(base: string) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Icono nombre={(focused ? base : `${base}-outline`) as NombreIcono} tamano="lg" color={color} />
  );
}

function Pestanas() {
  const { sesion } = useAuth();
  const rol = sesion?.rol;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarStyle: {
          backgroundColor: colores.superficie,
          borderTopColor: colores.borde,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: fuentes.medium, fontSize: 11 },
      }}>
      <Tab.Screen
        name="Inicio"
        component={InicioScreen}
        options={{ tabBarIcon: iconoPestana('home') }}
      />

      {rol === 'CLIENTE' && (
        <>
          <Tab.Screen
            name="Buscar"
            component={BuscarScreen}
            options={{ tabBarIcon: iconoPestana('search') }}
          />
          <Tab.Screen
            name="MisSolicitudes"
            component={MisSolicitudesScreen}
            options={{ title: 'Servicios', tabBarIcon: iconoPestana('briefcase') }}
          />
        </>
      )}

      {rol === 'MAESTRO' && (
        <>
          <Tab.Screen
            name="SolicitudesRecibidas"
            component={SolicitudesRecibidasScreen}
            options={{ title: 'Solicitudes', tabBarIcon: iconoPestana('file-tray-full') }}
          />
          <Tab.Screen
            name="Ingresos"
            component={IngresosScreen}
            options={{ tabBarIcon: iconoPestana('cash') }}
          />
        </>
      )}

      {rol === 'ADMIN' && (
        <>
          <Tab.Screen
            name="Admin"
            component={AdminMaestrosScreen}
            options={{ title: 'Maestros', tabBarIcon: iconoPestana('shield-checkmark') }}
          />
          <Tab.Screen
            name="AdminDisputas"
            component={AdminDisputasScreen}
            options={{ title: 'Disputas', tabBarIcon: iconoPestana('alert-circle') }}
          />
        </>
      )}

      {rol !== 'ADMIN' && (
        <Tab.Screen
          name="Chats"
          component={ChatsScreen}
          options={{ title: 'Chat', tabBarIcon: iconoPestana('chatbubbles') }}
        />
      )}

      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ tabBarIcon: iconoPestana('person') }}
      />
    </Tab.Navigator>
  );
}

export function Navegacion() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colores.fondo }}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {sesion ? (
          <>
            <Stack.Screen name="Tabs" component={Pestanas} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="MaestroPublico" component={MaestroPublicoScreen} />
            <Stack.Screen name="NuevaSolicitud" component={NuevaSolicitudScreen} />
            <Stack.Screen name="Pago" component={PagoScreen} />
            <Stack.Screen name="Calificar" component={CalificarScreen} />
            <Stack.Screen name="PerfilMaestro" component={PerfilMaestroScreen} />
            <Stack.Screen name="Favoritos" component={FavoritosScreen} />
            <Stack.Screen name="MisDatos" component={MisDatosScreen} />
            <Stack.Screen name="Direcciones" component={DireccionesScreen} />
            <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
            <Stack.Screen name="Privacidad" component={PrivacidadScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
            <Stack.Screen name="Registro" component={RegistroScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Recuperar" component={RecuperarScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
