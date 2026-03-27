import React from 'react';
import { Platform } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import CustomDrawer from '../components/common/CustomDrawer';
import HamburgerButton from '../components/common/HamburgerButton';
import { useTheme } from '../context/ThemeContext';

// Import all screens
import SuperAdminHomeScreen from '../features/auth/screens/SuperAdminHomeScreen';
import AdminHomeScreen from '../features/auth/screens/AdminHomeScreen';
import PMHomeScreen from '../features/auth/screens/PMHomeScreen';
import SiteHomeScreen from '../features/auth/screens/SiteHomeScreen';
import CustomerHomeScreen from '../features/auth/screens/CustomerHomeScreen';
import FinanceHomeScreen from '../features/auth/screens/FinanceHomeScreen';
import ProfileScreen from '../features/auth/screens/ProfileScreen';
import UsersListScreen from '../features/users/screens/UsersListScreen';
import UserDetailScreen from '../features/users/screens/UserDetailScreen';
import CreateUserScreen from '../features/users/screens/CreateUserScreen';
import ProjectsListScreen from '../features/projects/screens/ProjectsListScreen';
import ProjectDetailScreen from '../features/projects/screens/ProjectDetailScreen';
import CreateProjectScreen from '../features/projects/screens/CreateProjectScreen';
import SubmitReportScreen from '../features/reports/screens/SubmitReportScreen';
import ViewReportScreen from '../features/reports/screens/ViewReportScreen';
import ReportsListScreen from '../features/reports/screens/ReportsListScreen';
import GenerateQuotationScreen from '../features/quotations/screens/GenerateQuotationScreen';
import ViewQuotationScreen from '../features/quotations/screens/ViewQuotationScreen';
import QuotationsListScreen from '../features/quotations/screens/QuotationsListScreen';
import CreatePaymentScreen from '../features/payments/screens/CreatePaymentScreen';
import CreateFinalPaymentScreen from '../features/payments/screens/CreateFinalPaymentScreen';
import AddExtraChargeScreen from '../features/payments/screens/AddExtraChargeScreen';
import PayExtraChargeScreen from '../features/payments/screens/PayExtraChargeScreen';
import VerifyPaymentsScreen from '../features/payments/screens/VerifyPaymentsScreen';
import SignatureScreen from '../features/signatures/screens/SignatureScreen';
import ViewSignatureScreen from '../features/signatures/screens/ViewSignatureScreen';
import AuditLogsScreen from '../features/audit/screens/AuditLogsScreen';
import SitePlansScreen from '../features/site-plans/screens/SitePlansScreen';
import OrdersListScreen from '../features/orders/screens/OrdersListScreen';
import CreateOrderScreen from '../features/orders/screens/CreateOrderScreen';
import OrderDetailScreen from '../features/orders/screens/OrderDetailScreen';
import OrderPaymentScreen from '../features/orders/screens/OrderPaymentScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Stack navigator for each home screen
const HomeStack = ({ HomeComponent, name }) => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textWhite,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => Platform.OS !== 'web' ? <HamburgerButton navigation={navigation} /> : null,
      })}
    >
      <Stack.Screen 
        name={`${name}Main`} 
        component={HomeComponent}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ProjectsList" 
        component={ProjectsListScreen}
        options={{ headerShown: false}}
      />
      <Stack.Screen 
        name="ProjectDetail" 
        component={ProjectDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateProject" 
        component={CreateProjectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UsersList" 
        component={UsersListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserDetail" 
        component={UserDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateUser" 
        component={CreateUserScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SubmitReport" 
        component={SubmitReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ViewReport" 
        component={ViewReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ReportsList" 
        component={ReportsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GenerateQuotation" 
        component={GenerateQuotationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ViewQuotation" 
        component={ViewQuotationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="QuotationsList" 
        component={QuotationsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePayment" 
        component={CreatePaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateFinalPayment" 
        component={CreateFinalPaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddExtraCharge" 
        component={AddExtraChargeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PayExtraCharge" 
        component={PayExtraChargeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="VerifyPayments" 
        component={VerifyPaymentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Signature" 
        component={SignatureScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ViewSignature" 
        component={ViewSignatureScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AuditLogs" 
        component={AuditLogsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SitePlans" 
        component={SitePlansScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrdersList"
        component={OrdersListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'New Order' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderPayment"
        component={OrderPaymentScreen}
        options={{ title: 'Make Payment' }}
      />
    </Stack.Navigator>
  );
};

const DrawerNavigator = () => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const getHomeScreen = () => {
    switch (user?.role) {
      case 'super_admin':
        return { component: SuperAdminHomeScreen, name: 'SuperAdminHome' };
      case 'admin':
        return { component: AdminHomeScreen, name: 'AdminHome' };
      case 'project_manager':
        return { component: PMHomeScreen, name: 'PMHome' };
      case 'finance':
        return { component: FinanceHomeScreen, name: 'FinanceHome' };
      case 'site_incharge':
        return { component: SiteHomeScreen, name: 'SiteHome' };
      case 'customer':
        return { component: CustomerHomeScreen, name: 'CustomerHome' };
      default:
        return { component: CustomerHomeScreen, name: 'CustomerHome' };
    }
  };

  const { component: HomeComponent, name: homeName } = getHomeScreen();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: Platform.OS === 'web' ? 280 : 280,
          backgroundColor: colors.sidebarBg,
        },
        drawerType: Platform.OS === 'web' ? 'permanent' : 'slide',
        drawerPosition: 'right',
        overlayColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Drawer.Screen name={homeName}>
        {() => <HomeStack HomeComponent={HomeComponent} name={homeName} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
