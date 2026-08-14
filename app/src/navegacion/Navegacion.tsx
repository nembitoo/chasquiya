import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../estado/AuthContext';
import { Oficio } from '../api/tipos';
import { AdminMaestrosScreen } from '../pantallas/AdminMaestrosScreen';
import { BienvenidaScreen } from '../pantallas/BienvenidaScreen';
import { BuscarScreen } from '../pantallas/BuscarScreen';
import { ChatScreen } from '../pantallas/ChatScreen';
import { IngresosScreen } from '../pantallas/IngresosScreen';
import { InicioScreen } from '../pantallas/InicioScreen';
import { LoginScreen } from '../pantallas/LoginScreen';
import { MaestroPublicoScreen } from '../pantallas/MaestroPublicoScreen';
import { MisSolicitudesScreen } from '../pantallas/MisSolicitudesScreen';
import { NuevaSolicitudScreen } from '../pantallas/NuevaSolicitudScreen';
import { PagoScreen } from '../pantallas/PagoScreen';
import { PerfilMaestroScreen } from '../pantallas/PerfilMaestroScreen';
import { RegistroScreen } from '../pantallas/RegistroScreen';
import { SolicitudesRecibidasScreen } from '../pantallas/SolicitudesRecibidasScreen';
import { colores } from '../tema/tema';

export type RootStackParamList = {
  Bienvenida: undefined;
  Registro: undefined;
  Login: undefined;
  Inicio: undefined;
  PerfilMaestro: undefined;
  Admin: undefined;
  Buscar: undefined;
  MaestroPublico: { usuarioId: number };
  NuevaSolicitud: { maestroId: number; maestroNombre: string; oficios: Oficio[] };
  MisSolicitudes: undefined;
  SolicitudesRecibidas: undefined;
  Chat: { solicitudId: number; contraparteNombre: string };
  Pago: { solicitudId: number };
  Ingresos: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="Inicio" component={InicioScreen} />
            <Stack.Screen name="Buscar" component={BuscarScreen} />
            <Stack.Screen name="MaestroPublico" component={MaestroPublicoScreen} />
            <Stack.Screen name="NuevaSolicitud" component={NuevaSolicitudScreen} />
            <Stack.Screen name="MisSolicitudes" component={MisSolicitudesScreen} />
            <Stack.Screen name="SolicitudesRecibidas" component={SolicitudesRecibidasScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Pago" component={PagoScreen} />
            <Stack.Screen name="Ingresos" component={IngresosScreen} />
            <Stack.Screen name="PerfilMaestro" component={PerfilMaestroScreen} />
            <Stack.Screen name="Admin" component={AdminMaestrosScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
            <Stack.Screen name="Registro" component={RegistroScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
