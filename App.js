import React, { useState, useEffect } from 'react';
import { StyleSheet,Modal, Text, View, FlatList, TextInput, Button, Keyboard, ScrollView, TouchableOpacity } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';



const db = SQLite.openDatabase('fridge.db');

const FridgeBuddyApp = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, expirationDate TEXT, location TEXT);'
      );
      tx.executeSql(
        'SELECT * FROM items',
        [],
        (_, { rows: { _array } }) => setItems(_array)
      );
    });
  }, []);
  const ManualEntryModal = ({
    visible,
    onClose,
    onSave,
    newItem,
    setNewItem,
    expirationDate,
    setExpirationDate,
    location,
    setLocation,
  }) => {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={newItem}
              onChangeText={setNewItem}
            />
            <TextInput
              style={styles.input}
              placeholder="Expiration Date"
              value={expirationDate}
              onChangeText={setExpirationDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
            />
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={onClose} />
              <Button title="Save" onPress={onSave} />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
  
    try {
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`);
      const productData = response.data;
  
      setNewItem(productData.name);
      setExpirationDate(productData.expirationDate);
      setLocation(productData.location);
    } catch (error) {
      console.error('Error fetching product data:', error);
      setShowManualEntryModal(true);
    }
  };

const isValidText = (text) => {
  return text.trim().length > 0;
};

const dateRegex = /^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/;

const isValidDate = (date) => {
  return dateRegex.test(date);
};

const addItem = () => {
  if (!isValidText(newItem)) {
    Alert.alert('Invalid Data', 'Please enter a valid name.');
    return;
  }

  if (!isValidDate(expirationDate)) {
    Alert.alert('Invalid Data', 'Please enter a valid date.');
    return;
  }

  if (!isValidText(location)) {
    Alert.alert('Invalid Data', 'Please enter a valid location.');
    return;
  }

  db.transaction(tx => {
    tx.executeSql(
      'INSERT INTO items (name, expirationDate, location) VALUES (?,?,?)',
      [newItem, expirationDate, location]
    );
    tx.executeSql(
      'SELECT * FROM items',
      [],
      (_, { rows: { _array } }) => setItems(_array)
    );
  });
  setNewItem('');
  setExpirationDate('');
  setLocation('');
  Keyboard.dismiss();
};
  const deleteItem = (id) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM items WHERE id =?',
        [id],
        (_, { rowsAffected }) => {
          if (rowsAffected > 0) {
            setItems(items.filter((item) => item.id!== id));
          }
        }
      );
    });
  };

  const sendExpiringItemNotification = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM items WHERE expirationDate <= DATE("now","+2 days")',
        [],
        (_, { rows: { _array } }) => {
          const expiringItems = _array;
          if (expiringItems.length > 0) {
            const message = `The following items are about to expire in 2 days: ${expiringItems
             .map((item) => item.name)
             .join(', ')}`;
            Alert.alert('Expiring Items', message);
          }
        }
      );
    });
  };
  
  // Call the sendExpiringItemNotification function at regular intervals
  setInterval(sendExpiringItemNotification, 60000); // Check every minute
  const deleteSelectedItems = () => {
    selectedItems.forEach((item) => {
      deleteItem(item.id);
    });
    setSelectedItems([]);
  };
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemDetails}>Expiration: {item.expirationDate}</Text>
      <Text style={styles.itemDetails}>Location: {item.location}</Text>
      <Button title="Delete" onPress={() => deleteItem(item.id)} />
    </View>
  );

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Fridge-Buddy</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="New item"
              value={newItem}
              onChangeText={setNewItem}
            />
            <TextInput
              style={styles.input}
              placeholder="Expiration date"
              value={expirationDate}
              onChangeText={setExpirationDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
            />
            <Button title="Add Item" onPress={addItem} />
          </View>
          <View style={styles.scannerContainer}>
            {scanned ? (
              <Text>Barcode: {newItem}</Text>
            ) : (
              <BarCodeScanner
                onBarCodeScanned={handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
            )}
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            style={styles.list}
          />
           
        </View>
      </ScrollView>
      <ManualEntryModal
      visible={showManualEntryModal}
      onClose={() => setShowManualEntryModal(false)}
      onSave={() => {
        addItem();
        setShowManualEntryModal(false);
      }}
      newItem={newItem}
      setNewItem={setNewItem}
      expirationDate={expirationDate}
      setExpirationDate={setExpirationDate}
      location={location}
      setLocation={setLocation}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    width: '100%',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
  },
  scannerContainer: {
    height: 200,
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginVertical: 5,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemDetails: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  itemContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginVertical: 5,
  },
  selectedItem: {
    backgroundColor: '#e0e0e0',
  },
});


export default FridgeBuddyApp;