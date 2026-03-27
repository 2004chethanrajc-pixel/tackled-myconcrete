import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import SuperAdminHomeScreen from '../features/auth/screens/SuperAdminHomeScreen';
import AdminHomeScreen from '../features/auth/screens/AdminHomeScreen';
import PMHomeScreen from '../features/auth/screens/PMHomeScreen';
import SiteHomeScreen from '../features/auth/screens/SiteHomeScreen';
import CustomerHomeScreen from '../features/auth/screens/CustomerHomeScreen';
import FinanceHomeScreen from '../features/auth/screens/FinanceHomeScreen';
import UsersListScreen from '../features/users/screens/UsersListScreen';
import UserDetailScreen from '../features/users/screens/UserDetailScreen';
import ProjectsListScreen from '../features/projects/screens/ProjectsListScreen';
import ProjectDetailScreen from '../features/projects/screens/ProjectDetailScreen';
import CreateProjectScreen from '../features/projects/screens/CreateProjectScreen';
import SubmitReportScreen from '../features/reports/screens/SubmitReportScreen';
import ViewReportScreen from '../features/reports/screens/ViewReportScreen';
import GenerateQuotationScreen from '../features/quotations/screens/GenerateQuotationScreen';
import ViewQuotationScreen from '../features/quotations/screens/ViewQuotationScreen';
import CreatePaymentScreen from '../features/payments/screens/CreatePaymentScreen';
import CreateFinalPaymentScreen from '../features/payments/screens/CreateFinalPaymentScreen';
import AddExtraChargeScreen from '../features/payments/screens/AddExtraChargeScreen';
import PayExtraChargeScreen from '../features/payments/screens/PayExtraChargeScreen';
import AuditLogsScreen from '../features/audit/screens/AuditLogsScreen';
import ReportsListScreen from '../features/reports/screens/ReportsListScreen';
import { getHomeScreenForRole } from '../utils/roleHelper';
import QuotationsListScreen from '../features/quotations/screens/QuotationsListScreen';
import CreateUserScreen from '../features/users/screens/CreateUserScreen';
import OrdersListScreen from '../features/orders/screens/OrdersListScreen';
import CreateOrderScreen from '../features/orders/screens/CreateOrderScreen';
import OrderDetailScreen from '../features/orders/screens/OrderDetailScreen';
import OrderPaymentScreen from '../features/orders/screens/OrderPaymentScreen';
const Stack = createStackNavigator();

const MainNavigator = () => {
  const { user } = useAuth();
  const initialRoute = getHomeScreenForRole(user?.role);

  return (
    
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="SuperAdminHome" 
        component={SuperAdminHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminHome" 
        component={AdminHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PMHome" 
        component={PMHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SiteHome" 
        component={SiteHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CustomerHome" 
        component={CustomerHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FinanceHome" 
        component={FinanceHomeScreen}
        options={{ headerShown: false }}
      />
      
      {/* Users Screens */}
      <Stack.Screen 
        name="UsersList" 
        component={UsersListScreen}
        options={{ title: 'Users' }}
      />
      <Stack.Screen 
        name="UserDetail" 
        component={UserDetailScreen}
        options={{ title: 'User Details' }}
      />
      
      {/* Projects Screens */}
      <Stack.Screen 
        name="ProjectsList" 
        component={ProjectsListScreen}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen 
        name="ProjectDetail" 
        component={ProjectDetailScreen}
        options={{ title: 'Project Details' }}
      />
      <Stack.Screen 
        name="CreateProject" 
        component={CreateProjectScreen}
        options={{ headerShown: false }}
      />
      
      {/* Reports Screens */}
      <Stack.Screen 
        name="SubmitReport" 
        component={SubmitReportScreen}
        options={{ title: 'Submit Site Report' }}
      />
      <Stack.Screen 
        name="ReportsList" 
        component={ReportsListScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen 
        name="ViewReport" 
        component={ViewReportScreen}
        options={{ title: 'View Report' }}
      />
      
      {/* Quotations Screens */}
      <Stack.Screen 
        name="GenerateQuotation" 
        component={GenerateQuotationScreen}
        options={{ title: 'Generate Quotation' }}
      />
      <Stack.Screen 
        name="QuotationsList" 
        component={QuotationsListScreen}
        options={{ title: 'Quotations' }}
      />
      <Stack.Screen 
        name="ViewQuotation" 
        component={ViewQuotationScreen}
        options={{ title: 'View Quotation' }}
      />
      
      {/* Payments Screens */}
      <Stack.Screen 
        name="CreatePayment" 
        component={CreatePaymentScreen}
        options={{ title: 'Make Advance Payment' }}
      />
      <Stack.Screen 
        name="CreateFinalPayment" 
        component={CreateFinalPaymentScreen}
        options={{ title: 'Pay Final Amount' }}
      />
      <Stack.Screen 
        name="AddExtraCharge" 
        component={AddExtraChargeScreen}
        options={{ title: 'Add Extra Charge' }}
      />
      <Stack.Screen 
        name="PayExtraCharge" 
        component={PayExtraChargeScreen}
        options={{ title: 'Pay Extra Charge' }}
      />
      <Stack.Screen
  name="CreateUser"
  component={CreateUserScreen}
/>
      {/* Audit Screens */}
      <Stack.Screen 
        name="AuditLogs" 
        component={AuditLogsScreen}
        options={{ title: 'Audit Logs' }}
      />

      {/* Orders Screens */}
      <Stack.Screen
        name="OrdersList"
        component={OrdersListScreen}
        options={{ title: 'Orders' }}
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

export default MainNavigator;
