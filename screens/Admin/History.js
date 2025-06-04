import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const API_BASE_URL = 'http://192.168.1.7:3000'; // Use your actual backend IP

const History = () => {
  const [shipments, setShipments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/shipment`);
      const data = response.data || [];
      setShipments(data);
      setFiltered(data);
    } catch (error) {
      console.error('Error loading shipments:', error);
      Alert.alert('Error', 'Failed to load shipment data.');
    }
  };

  const filterByDate = () => {
    if (startDate && endDate) {
      const filteredData = shipments.filter((item) => {
        const createdDate = new Date(item.created_at || item.date);
        return createdDate >= startDate && createdDate <= endDate;
      });
      setFiltered(filteredData);
    }
  };

  const formatDate = (date) => {
    return date ? date.toISOString().split('T')[0] : 'Select Date';
  };

  const renderImages = (item) => {
    const images = [item.image1, item.image2, item.image3].filter(Boolean);
    return (
      <ScrollView horizontal>
        {images.map((uri, index) => (
          <Image
            key={index}
            source={{ uri: `${API_BASE_URL}/${uri}` }}
            style={styles.image}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Shipment History</Text>

      <View style={styles.datePickerRow}>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
          <Icon name="calendar" size={20} color="#333" />
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
          <Icon name="calendar" size={20} color="#333" />
          <Text style={styles.dateText}>{formatDate(endDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={filterByDate} style={styles.filterButton}>
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.material_Name}</Text>
            <Text style={styles.cardText}>Details: {item.detail}</Text>
            <Text style={styles.cardText}>Qty: {item.quantity}</Text>
            <Text style={styles.cardText}>Unit Price: ₹{item.price_per_unit}</Text>
            <Text style={styles.cardText}>Total Price: ₹{item.total_price}</Text>
            <Text style={styles.cardText}>Status: {item.status}</Text>
            <Text style={styles.cardText}>Pickup: {item.pickup_location}</Text>
            <Text style={styles.cardText}>Drop: {item.drop_location}</Text>
            <Text style={styles.cardText}>Destination: {item.destination}</Text>
            <Text style={styles.cardText}>Customer ID: {item.c_id}</Text>
            <Text style={styles.cardText}>Employee ID: {item.e_id}</Text>
            {renderImages(item)}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#eef1f5',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 2,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  filterText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: '#555',
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 8,
  },
});

export default History;
