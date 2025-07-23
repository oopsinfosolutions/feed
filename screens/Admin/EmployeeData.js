import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card, Text, Title, Searchbar } from 'react-native-paper';
import axios from 'axios';

const EmployeeData = () => {
  const [fieldEmployees, setFieldEmployees] = useState([]);
  const [officeEmployees, setOfficeEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [employeeType, setEmployeeType] = useState('field'); // default: field

  const API_BASE_URL = 'http://192.168.1.42:3000';

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/both_employees`);
      if (response.data.success) {
        setFieldEmployees(response.data.fieldEmp || []);
        setOfficeEmployees(response.data.officeEmp || []);
      } else {
        setFieldEmployees([]);
        setOfficeEmployees([]);
      }
    } catch (err) {
      Alert.alert('Error', `Failed to load employee data: ${err.message}`);
      setFieldEmployees([]);
      setOfficeEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployeeData();
    setRefreshing(false);
  };

  const filteredEmployeeData =
    (employeeType === 'field' ? fieldEmployees : officeEmployees).filter(emp => {
      const query = searchQuery.toLowerCase();
      return (
        (!searchQuery ||
          emp.name?.toLowerCase().includes(query) ||
          emp.phone?.toLowerCase().includes(query) ||
          emp.address?.toLowerCase().includes(query)) &&
        (selectedStatus === 'all' ||
          emp.status?.toLowerCase() === selectedStatus.toLowerCase())
      );
    });

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      case 'submitted':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const EmployeeTypeToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          employeeType === 'field' && styles.toggleButtonActive,
        ]}
        onPress={() => setEmployeeType('field')}>
        <Text
          style={[
            styles.toggleButtonText,
            employeeType === 'field' && styles.toggleButtonTextActive,
          ]}>
          Field
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          employeeType === 'office' && styles.toggleButtonActive,
        ]}
        onPress={() => setEmployeeType('office')}>
        <Text
          style={[
            styles.toggleButtonText,
            employeeType === 'office' && styles.toggleButtonTextActive,
          ]}>
          Office
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>
          {employeeType === 'field' ? 'Field Employees' : 'Office Employees'}
        </Title>
      </View>

      <EmployeeTypeToggle />

      <Searchbar
        placeholder="Search employees..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredEmployeeData.map(employee => (
          <Card key={employee.id} style={styles.employeeCard}>
            <Card.Content>
              <Title>{employee.name || 'Unnamed'}</Title>
              <Text>📞 {employee.phone || 'N/A'}</Text>
              <Text>📍 {employee.address || 'N/A'}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(employee.status) },
                ]}>
                <Text style={styles.statusText}>
                  {employee.status?.toUpperCase() || 'SUBMITTED'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredEmployeeData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No employees found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeeData;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  toggleButton: {
    padding: 10,
    marginHorizontal: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#2563EB',
  },
  toggleButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  searchBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  employeeCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 8,
    backgroundColor: '#fff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
