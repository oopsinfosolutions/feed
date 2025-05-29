import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Provider } from 'react-native-paper';

const { width } = Dimensions.get('window');

const AdminScreen = () => {
  const navigation = useNavigation();
  const [usersCount, setUsersCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    // Mock fetching data, replace these with actual API calls
    setUsersCount(150);
    setMaterialsCount(80);
    setReportsCount(25);
  }, []);

  const handleNavigation = (route) => {
    navigation.navigate(route);
  };

  const CardButton = ({ icon, text, count, route, image }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleNavigation(route)}>
      <View style={styles.cardContent}>
        <Image source={image} style={styles.cardImage} />
        <Ionicons name={icon} size={50} color="white" style={styles.cardIcon} />
        <Text style={styles.cardText}>{text}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Provider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.heading}>Admin Panel</Text>

        <View style={styles.cardRow}>
          <CardButton
            icon="people-outline"
            text="Users"
            count={usersCount}
            route="Users"
//            image={require('./assets/users.png')} // Replace with actual image
          />
          <CardButton
            icon="folder-outline"
            text="Materials"
            count={materialsCount}
            route="#"
//            image={require('./assets/materials.png')} // Replace with actual image
          />
          <CardButton
            icon="stats-chart-outline"
            text="Reports"
            count={reportsCount}
            route="#"
//            image={require('./assets/reports.png')} // Replace with actual image
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1f2937',
    textAlign: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  card: {
    backgroundColor: '#4f46e5',
    width: width * 0.4,
    aspectRatio: 1,
    borderRadius: width * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardImage: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  cardIcon: {
    position: 'absolute',
    top: 10,
  },
  cardText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 30,
    paddingVertical: 15,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignSelf: 'center',
    width: '70%',
  },
  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminScreen;