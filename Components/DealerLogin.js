import React from 'react';
import { View, Text, Button } from 'react-native';

const DealerLogin = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Dealer Login Page</Text>
      <Button title="Login as Dealer" onPress={() => navigation.navigate('EmployeeDataScreen')} />
    </View>
  );
};

export default Login;
