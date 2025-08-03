// SAFE APPROACH: No try-catch, just direct fallback screens
// Replace your App.js with this if TEST 7 fails

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';

// Import existing components and screens
import LoginForm from './Components/LoginForm';
import Signup from './Components/Signup';
import CustomerScreen from './screens/CustomerScreen';
import Navbar from './Components/Navbar';
import EmployeeDataScreen from './screens/EmployeeDataScreen';
import AdminScreen from './screens/AdminScreen';
import EmployeeScreen from './screens/EmployeeScreen';
import OfficeEmployeeScreen from './screens/OfficeEmployeeScreen';
import SalePurchaseEmployeeScreen from './screens/SalePurchaseEmployeeScreen';

// Import Admin screens
import Users from './screens/Admin/Users';
import Product from './screens/Admin/Product';
import CreateOrder from './screens/Admin/CreateOrder';
import EmployeeData from './screens/Admin/EmployeeData';
import ClientFeedbackScreen from './screens/Admin/ClientFeedbackScreen';
import BillsScreen from './screens/Admin/BillsScreen';

const Stack = createStackNavigator();

// Simple fallback screens - NO TRY-CATCH
const ViewOrdersScreen = ({ navigation }) => (
  <SafeAreaView style={styles.fallbackContainer}>
    <Text style={styles.fallbackTitle}>View Orders</Text>
    <Text style={styles.fallbackText}>This screen is being developed</Text>
  </SafeAreaView>
);

const MaterialsScreen = ({ navigation }) => (
  <SafeAreaView style={styles.fallbackContainer}>
    <Text style={styles.fallbackTitle}>Materials</Text>
    <Text style={styles.fallbackText}>This screen is being developed</Text>
  </SafeAreaView>
);

const MaterialForm = ({ navigation }) => (
  <SafeAreaView style={styles.fallbackContainer}>
    <Text style={styles.fallbackTitle}>Add Material</Text>
    <Text style={styles.fallbackText}>This screen is being developed</Text>
  </SafeAreaView>
);

const MaterialList = ({ navigation }) => (
  <SafeAreaView style={styles.fallbackContainer}>
    <Text style={styles.fallbackTitle}>Material List</Text>
    <Text style={styles.fallbackText}>This screen is being developed</Text>
  </SafeAreaView>
);

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login" 
          screenOptions={{ 
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          {/* Authentication Screens */}
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="Signup" component={Signup} />

          {/* Main User Screens */}
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
          <Stack.Screen name="EmployeeDataScreen" component={EmployeeDataScreen} />
          <Stack.Screen name="EmployeeScreen" component={EmployeeScreen} />
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          <Stack.Screen name="OfficeEmployeeScreen" component={OfficeEmployeeScreen} />
          <Stack.Screen name="SalePurchaseEmployeeScreen" component={SalePurchaseEmployeeScreen} />

          {/* Navigation Component */}
          <Stack.Screen name="Navbar" component={Navbar} />

          {/* Admin Screens */}
          <Stack.Screen name="Users" component={Users} />
          <Stack.Screen name="Product" component={Product} />
          <Stack.Screen name="CreateOrder" component={CreateOrder} />
          <Stack.Screen name="ViewOrders" component={ViewOrdersScreen} />
          <Stack.Screen name="EmployeeData" component={EmployeeData} />
          <Stack.Screen name="ClientFeedback" component={ClientFeedbackScreen} />
          <Stack.Screen name="Bills" component={BillsScreen} />
          <Stack.Screen name="BillsScreen" component={BillsScreen} />

          {/* Material Management Screens */}
          <Stack.Screen name="Materials" component={MaterialsScreen} />
          <Stack.Screen name="MaterialForm" component={MaterialForm} />
          <Stack.Screen name="MaterialList" component={MaterialList} />

          {/* Alternative Screen Names */}
          <Stack.Screen name="Customer" component={CustomerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});