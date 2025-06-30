import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView, Text } from 'react-native';

import LoginForm from './Components/LoginForm';
import Signup from './Components/Signup';
import CustomerScreen from './screens/CustomerScreen';
import Navbar from './Components/Navbar';
import DealerScreen from './screens/DealerScreen';
import AdminScreen from './screens/AdminScreen';
import Users from './screens/Admin/Users';
import Material from './screens/Admin/Material';
import History from './screens/Admin/History';
import Dealers from './screens/Admin/Dealers';
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
          <Stack.Screen name="DealerScreen" component={DealerScreen} />
          <Stack.Screen name="EmployeeScreen" component={EmployeeScreen} />
          <Stack.Screen name="Navbar" component={Navbar} />
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          <Stack.Screen name="OfficeEmployeeScreen" component={OfficeEmployeeScreen} />
          <Stack.Screen name="Users" component={Users} />
          <Stack.Screen name="Material" component={Material} />
          <Stack.Screen name="History" component={History} />
          <Stack.Screen name="Dealers" component={Dealers} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
