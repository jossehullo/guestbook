require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Disable file uploads for now
const upload = multer(); // No storage, just process form data

// MongoDB Atlas connection
const url = process.env.MONGO_URI || 'mongodb+srv://josephhullo_db_user:<your_actual_password>@cluster0.rw6gtlj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'josephhullo';
let db;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('✅ Connected to MongoDB Atlas at:', url);
    db = client.db(dbName);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message, err.stack);
  });

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Guestbook API is running!');
});

// POST - Add a message
app.post('/api/messages', upload.none(), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    if (!db) throw new Error('Database connection not established');
    const { text, author } = req.body;
    const timestamp = new Date().toISOString();

    if (!text || !author) {
      return res.status(400).json({ error: 'Text and author are required' });
    }

    const message = { text, author, timestamp };
    const result = await db.collection('messages').insertOne(message);
    console.log('Message inserted:', result);
    res.status(201).json(result);
  } catch (err) {
    console.error('Insert error:', err.message, err.stack);
    res.status(500).json({ error: `Failed to add message: ${err.message}` });
  }
});

// GET - Fetch all messages
app.get('/api/messages', async (req, res) => {
  try {
    if (!db) throw new Error('Database connection not established');
    const messages = await db.collection('messages').find({}).toArray();
    console.log('Fetched messages:', messages);
    res.json(messages);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// DELETE - Remove a message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    const result = await db.collection('messages').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// PUT - Update a message
app.put('/api/messages/:id', upload.none(), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    if (!db) throw new Error('Database connection not established');
    const { text, author } = req.body;
    const timestamp = new Date().toISOString();

    if (!text || !author) {
      return res.status(400).json({ error: 'Text and author are required' });
    }

    const updateData = { text, author, timestamp };
    const result = await db.collection('messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(200).json({ message: 'Message updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});