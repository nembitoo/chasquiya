import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../estado/AuthContext';
import { AdminMaestrosScreen } from '../pantallas/AdminMaestrosScreen';
import { BienvenidaScreen } from '../pantallas/BienvenidaScreen';
import { InicioScreen } from '../pantallas/InicioScreen';
import { LoginScreen } from '../pantallas/LoginScreen';
import { PerfilMaestroScreen } from '../pantallas/PerfilMaestroScreen';
import { RegistroScreen } from '../pantallas/RegistroScreen';
import { colores } from '../tema/tema';

export type RootStackParamList = {
  Bienvenida: undefined;
  Registro: undefined;
  Login: undefined;
  Inicio: undefined;
  PerfilMaestro: undefined;
  Admin: undefined;
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
