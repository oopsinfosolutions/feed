import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Card } from 'react-native-paper';

export default function MaterialList({ materials }) {
  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Title title={item.name} subtitle={item.detail} />
      <Card.Content>
        <Text>Quantity: {item.quantity}</Text>
        <Text>Price per unit: ₹{item.price}</Text>
        <Text>Total: ₹{item.total}</Text>
        <Text>Destination: {item.destination}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <FlatList data={materials} renderItem={renderItem} keyExtractor={(item, index) => index.toString()} />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 }
});
