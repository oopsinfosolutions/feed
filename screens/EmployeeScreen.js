import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const EmployeeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Hello Employee!</Text>
    </SafeAreaView>
  );
};

export default EmployeeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    padding: 16,
  },
  text: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00796b',
  },
});
