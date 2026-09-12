import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ShipmentsScreen } from '../screens/ShipmentsScreen';
import { ShipmentDetailScreen } from '../screens/ShipmentDetailScreen';
import { ReceivingScreen } from '../screens/ReceivingScreen';
import { ReceivingPhotoScreen } from '../screens/ReceivingPhotoScreen';
import { InspectionScreen } from '../screens/InspectionScreen';
import { DamageReportScreen } from '../screens/DamageReportScreen';
import { DamagePhotoScreen } from '../screens/DamagePhotoScreen';
import { CartonFormScreen } from '../screens/CartonFormScreen';
import { BoxLabelScreen } from '../screens/BoxLabelScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { colors } from '../config';

const modalScreenOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: '#fff',
  presentation: 'modal' as const,
};

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  const { can } = useAuth();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.amber,
      }}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      {can('shipments.view') && <Tabs.Screen name="Shipments" component={ShipmentsScreen} />}
      {can('products.view') && <Tabs.Screen name="Products" component={ProductsScreen} />}
      {can('invoices.view') && <Tabs.Screen name="Invoices" component={InvoicesScreen} />}
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="ShipmentDetail"
              component={ShipmentDetailScreen}
              options={{ title: 'Shipment', headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff' }}
            />
            <Stack.Screen name="Receiving" component={ReceivingScreen} options={{ title: 'Record receiving', ...modalScreenOptions }} />
            <Stack.Screen name="ReceivingPhoto" component={ReceivingPhotoScreen} options={{ title: 'Add photo', ...modalScreenOptions }} />
            <Stack.Screen name="Inspection" component={InspectionScreen} options={{ title: 'Record inspection', ...modalScreenOptions }} />
            <Stack.Screen name="DamageReport" component={DamageReportScreen} options={{ title: 'Report damage', ...modalScreenOptions }} />
            <Stack.Screen name="DamagePhoto" component={DamagePhotoScreen} options={{ title: 'Add photo', ...modalScreenOptions }} />
            <Stack.Screen name="CartonForm" component={CartonFormScreen} options={{ title: 'Add carton', ...modalScreenOptions }} />
            <Stack.Screen name="BoxLabel" component={BoxLabelScreen} options={{ title: 'Apply box label', ...modalScreenOptions }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
