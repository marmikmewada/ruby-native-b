const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const AsyncStorage = require('@react-native-async-storage/async-storage');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware
app.use(bodyParser.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI; // Replace with your MongoDB URI
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define User model
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
}));

// Define Todo model
const Todo = mongoose.model('Todo', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  completed: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
}));

// Middleware to allow requests from any origin (CORS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Access denied, token required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token verification failed, authorization denied' });
  }
};

// Apply authentication middleware to all API routes under /api

// Routes
// User Authentication APIs
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
});

app.use('/api', verifyToken);
// Todo APIs
app.get('/api/todos', async (req, res) => {
  const userId = req.user.userId; // This comes from verifyToken middleware
  try {
    const todos = await Todo.find({ userId });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', async (req, res) => {
  const userId = req.user.userId; // This comes from verifyToken middleware
  const { title, description } = req.body;
  try {
    const newTodo = new Todo({ userId, title, description });
    await newTodo.save();
    res.status(201).json({ message: 'Todo created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  const userId = req.user.userId; // This comes from verifyToken middleware
  const { id } = req.params;
  const { title, description, completed } = req.body;
  try {
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, userId },
      { title, description, completed, updatedAt: Date.now() },
      { new: true }
    );
    if (!updatedTodo) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }
    res.json(updatedTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const userId = req.user.userId; // This comes from verifyToken middleware
  const { id } = req.params;
  try {
    const deletedTodo = await Todo.findOneAndDelete({ _id: id, userId });
    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});