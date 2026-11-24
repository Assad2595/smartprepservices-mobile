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
import { ShipmentCreateScreen } from '../screens/ShipmentCreateScreen';
import { ReceivingScreen } from '../screens/ReceivingScreen';
import { ReceivingPhotoScreen } from '../screens/ReceivingPhotoScreen';
import { InspectionScreen } from '../screens/InspectionScreen';
import { DamageReportScreen } from '../screens/DamageReportScreen';
import { DamagePhotoScreen } from '../screens/DamagePhotoScreen';
import { BoxFormScreen } from '../screens/BoxFormScreen';
import { BoxLabelScreen } from '../screens/BoxLabelScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProductFormScreen } from '../screens/ProductFormScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { InvoiceDetailScreen } from '../screens/InvoiceDetailScreen';
import { InvoiceFormScreen } from '../screens/InvoiceFormScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { PaymentDetailScreen } from '../screens/PaymentDetailScreen';
import { PaymentFormScreen } from '../screens/PaymentFormScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { colors } from '../config';

const headerOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: '#fff',
};

const modalScreenOptions = {
  ...headerOptions,
  presentation: 'modal' as const,
};

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/**
 * Tabs appear by permission only — a role is just a bundle of permissions,
 * so nothing here checks role names. The backend gates every endpoint the
 * same way; this only avoids showing a tab that would come back 403.
 */
function MainTabs() {
  const { can } = useAuth();

  return (
    <Tabs.Navigator
      screenOptions={{
        ...headerOptions,
        tabBarActiveTintColor: colors.amber,
      }}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      {can('tasks.view') && <Tabs.Screen name="Tasks" component={TasksScreen} />}
      {(can('shipments.view') || can('packages.view') || can('master_shipments.view')) && (
        <Tabs.Screen name="Shipments" component={ShipmentsScreen} />
      )}
      {can('products.view') && <Tabs.Screen name="Products" component={ProductsScreen} />}
      {can('invoices.view') && <Tabs.Screen name="Invoices" component={InvoicesScreen} />}
      {can('payments.view') && <Tabs.Screen name="Payments" component={PaymentsScreen} />}
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

            {/* Shipments */}
            <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} options={{ title: 'Shipment', ...headerOptions }} />
            <Stack.Screen name="ShipmentCreate" component={ShipmentCreateScreen} options={{ title: 'New shipment', ...modalScreenOptions }} />
            <Stack.Screen name="Receiving" component={ReceivingScreen} options={{ title: 'Record receiving', ...modalScreenOptions }} />
            <Stack.Screen name="ReceivingPhoto" component={ReceivingPhotoScreen} options={{ title: 'Add photo', ...modalScreenOptions }} />
            <Stack.Screen name="Inspection" component={InspectionScreen} options={{ title: 'Record inspection', ...modalScreenOptions }} />
            <Stack.Screen name="DamageReport" component={DamageReportScreen} options={{ title: 'Report damage', ...modalScreenOptions }} />
            <Stack.Screen name="DamagePhoto" component={DamagePhotoScreen} options={{ title: 'Add photo', ...modalScreenOptions }} />
            <Stack.Screen name="BoxForm" component={BoxFormScreen} options={{ title: 'Add box', ...modalScreenOptions }} />
            <Stack.Screen name="BoxLabel" component={BoxLabelScreen} options={{ title: 'Apply box label', ...modalScreenOptions }} />

            {/* Products */}
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product', ...headerOptions }} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product', ...modalScreenOptions }} />

            {/* Invoices */}
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice', ...headerOptions }} />
            <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'New invoice', ...modalScreenOptions }} />

            {/* Tasks */}
            <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task', ...modalScreenOptions }} />

            {/* Payments */}
            <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment', ...headerOptions }} />
            <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Record payment', ...modalScreenOptions }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
