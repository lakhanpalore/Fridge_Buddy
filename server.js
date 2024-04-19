const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const app = express();
const db = new sqlite3.Database('fridge.db');

// Middleware to parse JSON request bodies
app.use(express.json());
// Enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Replace with your Expo app's URL
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

// API endpoints
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', (err, rows) => {
    if (err) {
      console.error('Error fetching items:', err);
      return res.status(500).json({ error: 'An error occurred while fetching items' });
    }
    res.json(rows);
  });
});

app.post('/api/items', (req, res) => {
  const { name, expirationDate, location } = req.body;
  db.run(
    'INSERT INTO items (name, expirationDate, location) VALUES (?, ?, ?)',
    [name, expirationDate, location],
    (err) => {
      if (err) {
        console.error('Error adding item:', err);
        return res.status(500).json({ error: 'An error occurred while adding the item' });
      }
      res.status(201).json({ message: 'Item added successfully' });
    }
  );
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM items WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting item:', err);
      return res.status(500).json({ error: 'An error occurred while deleting the item' });
    }
    res.json({ message: 'Item deleted successfully' });
  });
});

// Fetch product information from an external API
app.get('/api/product', async (req, res) => {
  const { barcode } = req.query;
  try {
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`);
    const productData = response.data;
    res.json(productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ error: 'An error occurred while fetching product data' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});