import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export default function Navbar({ navigation }) {
  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={() => navigation.navigate('Customer')}>Customer</Button>
      <Button mode="contained" onPress={() => navigation.navigate('Materials')}>Materials</Button>
      <Button mode="contained" onPress={() => navigation.navigate('MaterialForm')}>Add Material</Button>
      <Button mode="contained" onPress={() => navigation.navigate('MaterialList')}>View Materials</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
});
