import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Title, Card } from 'react-native-paper';
import MaterialList from '../Components/MaterialList';

export default function CustomerScreen() {
  const [tab, setTab] = useState('Shipment'); // 'Shipment' or 'Materials'

  // Shipment Details states
  const [materialName, setMaterialName] = useState('');
  const [details, setDetails] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [destination, setDestination] = useState('');

  // Materials list for Materials tab
  const [materials, setMaterials] = useState([]);

  // Calculate total price whenever quantity or price changes
  useEffect(() => {
    const q = parseFloat(quantity);
    const p = parseFloat(price);
    if (!isNaN(q) && !isNaN(p)) {
      setTotalPrice((q * p).toFixed(2));
    } else {
      setTotalPrice('');
    }
  }, [quantity, price]);

  // Add material to materials list
  const handleAddMaterial = () => {
    if (materialName && details && quantity && price && destination) {
      const newMaterial = {
        name: materialName,
        detail: details,
        quantity,
        price,
        total: totalPrice,
        destination,
      };
      setMaterials([...materials, newMaterial]);
      // Clear form
      setMaterialName('');
      setDetails('');
      setQuantity('');
      setPrice('');
      setDestination('');
      setTotalPrice('');
      alert('Material added!');
    } else {
      alert('Please fill all fields.');
    }
  };

  // Render Shipment tab content
  const renderShipmentDetails = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Shipment Details</Title>

          <TextInput
            label="Material Name"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="cube-outline" />}
            value={materialName}
            onChangeText={setMaterialName}
          />
          <TextInput
            label="Details"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="information-outline" />}
            value={details}
            onChangeText={setDetails}
          />
          <TextInput
            label="Quantity"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Icon icon="counter" />}
            value={quantity}
            onChangeText={setQuantity}
          />
          <TextInput
            label="Price per Unit"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Icon icon="currency-inr" />}
            value={price}
            onChangeText={setPrice}
          />
          <TextInput
            label="Total Price"
            mode="outlined"
            style={styles.input}
            editable={false}
            left={<TextInput.Icon icon="calculator" />}
            value={totalPrice}
          />
          <TextInput
            label="Destination"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map-marker-outline" />}
            value={destination}
            onChangeText={setDestination}
          />

          <Button
            mode="contained"
            style={styles.button}
            onPress={handleAddMaterial}
          >
            Add Shipment
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  // Render Materials tab content
  const renderMaterialsDetails = () => (
    <View style={{ flex: 1 }}>
      <Title style={styles.title}>Materials List</Title>
      {materials.length === 0 ? (
        <Title style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
          No materials added yet.
        </Title>
      ) : (
        <MaterialList materials={materials} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Button
          mode={tab === 'Shipment' ? 'contained' : 'outlined'}
          onPress={() => setTab('Shipment')}
          style={[styles.tabButton, tab === 'Shipment' && styles.activeTab]}
          labelStyle={tab === 'Shipment' ? styles.activeTabLabel : styles.inactiveTabLabel}
        >
          Shipment Details
        </Button>
        <Button
          mode={tab === 'Materials' ? 'contained' : 'outlined'}
          onPress={() => setTab('Materials')}
          style={[styles.tabButton, tab === 'Materials' && styles.activeTab]}
          labelStyle={tab === 'Materials' ? styles.activeTabLabel : styles.inactiveTabLabel}
        >
          Materials Details
        </Button>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {tab === 'Shipment' ? renderShipmentDetails() : renderMaterialsDetails()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6f0',
    padding: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: '#ff8c00',
  },
  activeTabLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  inactiveTabLabel: {
    color: '#ff8c00',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    color: '#ff8c00',
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 25,
    backgroundColor: '#ff8c00',
    paddingVertical: 8,
  },
});
