const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const app = express();
const port = 3001;

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename with timestamp
  }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));

const url = 'mongodb://localhost:27017';
const dbName = 'myWebsiteDB';
let db;

MongoClient.connect(url)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(err => console.error('Failed to connect to MongoDB:', err));

app.post('/api/messages', upload.single('image'), async (req, res) => {
  try {
    const { text, author } = req.body;
    const timestamp = new Date().toISOString();
    let image = req.file ? req.file.filename : null;

    if (!text || !author) {
      return res.status(400).json({ error: 'Text and author are required' });
    }

    const message = { text, author, timestamp, image };
    const result = await db.collection('messages').insertOne(message);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find({}).toArray();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

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

app.put('/api/messages/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    const { text, author } = req.body;
    const timestamp = new Date().toISOString();
    let image = req.file ? req.file.filename : req.body.image; // Keep old image if no new upload

    if (!text || !author) {
      return res.status(400).json({ error: 'Text and author are required' });
    }

    const updateData = { text, author, timestamp };
    if (image) updateData.image = image;

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
  console.log(`Server running at http://localhost:${port}`);
});