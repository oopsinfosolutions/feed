import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import MaterialInput from '../Components/MaterialInput';
import MaterialList from '../Components/MaterialList';

export default function Materials() {
  const [materials, setMaterials] = useState([]);

  const handleAddMaterial = (material) => {
    setMaterials([...materials, material]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaterialInput onAdd={handleAddMaterial} />
      <MaterialList materials={materials} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 }
});
