import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView, Text } from 'react-native';

import LoginForm from './Components/LoginForm';
import Signup from './Components/Signup';
import CustomerScreen from './screens/CustomerScreen';
import Navbar from './Components/Navbar';
import EmployeeDataScreen from './screens/EmployeeDataScreen';
import AdminScreen from './screens/AdminScreen';
import Users from './screens/Admin/Users';
import Material from './screens/Admin/Material';
import CreateOrder from './screens/Admin/CreateOrder';
import EmployeeData from './screens/Admin/EmployeeData';
import EmployeeScreen from './screens/EmployeeScreen';
import OfficeEmployeeScreen from './screens/OfficeEmployeeScreen';



const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
          <Stack.Screen name="EmployeeDataScreen" component={EmployeeDataScreen} />
          <Stack.Screen name="EmployeeScreen" component={EmployeeScreen} />
          <Stack.Screen name="Navbar" component={Navbar} />
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          <Stack.Screen name="OfficeEmployeeScreen" component={OfficeEmployeeScreen} />
          <Stack.Screen name="Users" component={Users} />
          <Stack.Screen name="Material" component={Material} />
          <Stack.Screen name="CreateOrder" component={CreateOrder} />
          <Stack.Screen name="EmployeeData" component={EmployeeData} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
