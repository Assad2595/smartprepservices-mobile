import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
// This path, not '@expo/vector-icons': the package root bundles every icon font.
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UpdatePrompt } from '../shared/UpdatePrompt';
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
import { CompaniesScreen } from '../screens/CompaniesScreen';
import { CompanyDetailScreen } from '../screens/CompanyDetailScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { UserDetailScreen } from '../screens/UserDetailScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { colors } from '../config';

// Ink header with heavy titles and no shadow line (design canvas).
const headerOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: '#F5F3EE',
  headerTitleStyle: { fontWeight: '800' as const },
  headerShadowVisible: false,
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
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'grid-outline',
  Products: 'cube-outline',
  Inbound: 'arrow-down-circle-outline',
  Outbound: 'arrow-up-circle-outline',
  More: 'ellipsis-horizontal',
};

function MainTabs() {
  const { can } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <>
    {/* Offers a newer build uploaded on the portal (Android only). */}
    <UpdatePrompt />
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted2,
        tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS[route.name] ?? 'ellipse-outline'} size={22} color={color} />,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
        // Room for icon and label, above the phone's own navigation bar.
        tabBarStyle: { height: 56 + insets.bottom, backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarAllowFontScaling: false,
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      {can('products.view') && <Tabs.Screen name="Products" component={ProductsScreen} options={{ title: 'Inventory' }} />}
      {/* Shipments in two lists, as on the portal: goods coming in, and goods going out. */}
      {(can('shipments.view') || can('packages.view') || can('master_shipments.view')) && (
        <Tabs.Screen name="Inbound" component={ShipmentsScreen} initialParams={{ direction: 'inbound' }} options={{ title: 'Inbound' }} />
      )}
      {(can('shipments.view') || can('packages.view') || can('master_shipments.view')) && (
        <Tabs.Screen name="Outbound" component={ShipmentsScreen} initialParams={{ direction: 'outbound' }} options={{ title: 'Outbound' }} />
      )}
      {/* Invoices, Payments, Companies, Users and Tasks live behind More, so the bar stays at five tabs. */}
      <Tabs.Screen name="More" component={MoreScreen} />
    </Tabs.Navigator>
    </>
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

            {/* Invoices and payments lists (opened from More) */}
            <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices', ...headerOptions }} />
            <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments', ...headerOptions }} />

            {/* Invoices */}
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice', ...headerOptions }} />
            <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'New invoice', ...modalScreenOptions }} />

            {/* Tasks (opened from More) */}
            <Stack.Screen name="TaskList" component={TasksScreen} options={{ title: 'Tasks', ...headerOptions }} />
            <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task', ...modalScreenOptions }} />

            {/* Companies and users (opened from More) */}
            <Stack.Screen name="Companies" component={CompaniesScreen} options={{ title: 'Companies', ...headerOptions }} />
            <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} options={{ title: 'Company', ...headerOptions }} />
            <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Users', ...headerOptions }} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: 'User', ...headerOptions }} />

            {/* Payments */}
            <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment', ...headerOptions }} />
            <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Record payment', ...modalScreenOptions }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
