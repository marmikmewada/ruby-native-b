const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
}));

const Todo = mongoose.model('Todo', new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}));

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(bodyParser.json());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied, token required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("token verified:", decoded);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token verification failed, authorization denied' });
  }
};

// Change this to a GET route
app.get('/api/verifyToken', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Failed to authenticate token' });
    }
    res.json({ userId: decoded.userId });
  });
});

// Routes
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
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '28d' });
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Protected routes
app.get('/api/todos', verifyToken, async (req, res) => {
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }
    const todos = await Todo.find({ userId });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { title, description } = req.body;
  try {
    const newTodo = new Todo({ userId, title, description });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { title, description } = req.body;
  try {
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, userId },
      { title, description, updatedAt: Date.now() },
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

app.delete('/api/todos/:id', verifyToken, async (req, res) => {
  const userId = req.user.userId;
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});








// const express = require('express');
// require('dotenv').config();
// const mongoose = require('mongoose');
// const jwt = require('jsonwebtoken');
// const bodyParser = require('body-parser');

// // MongoDB models (User and Todo)
// const User = mongoose.model('User', new mongoose.Schema({
//   username: String,
//   password: String,
// }));

// const Todo = mongoose.model('Todo', new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   title: String,
//   description: String,
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// }));

// const app = express();
// const PORT = process.env.PORT || 5000;
// const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// // Middleware
// app.use(bodyParser.json());

// // MongoDB connection
// const MONGO_URI = process.env.MONGO_URI; // Replace with your MongoDB URI
// mongoose.connect(MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', () => {
//   console.log('Connected to MongoDB');
// });

// // Middleware to allow requests from any origin (CORS)
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

// // Middleware to verify JWT token
// const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) {
//     return res.status(401).json({ error: 'Access denied, token required' });
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.user = decoded;
//     console.log("token verified:", decoded);
//     next();
//   } catch (error) {
//     res.status(400).json({ error: 'Token verification failed, authorization denied' });
//   }
// };

// // Routes
// // User Authentication APIs
// app.post('/api/signup', async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const newUser = new User({ username, password });
//     await newUser.save();
//     res.status(201).json({ message: 'User created successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create user' });
//   }
// });

// app.post('/api/login', async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const user = await User.findOne({ username });
//     if (!user || user.password !== password) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '28d' });
//     res.json({ token, userId: user._id });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to login' });
//   }
// });

// // Apply authentication middleware to all API routes under /api
// app.use('/api', verifyToken);

// // Add a new route for token verification
// app.get('/verifyToken', (req, res) => {
//   // If the middleware verifyToken passes, the token is valid
//   res.status(200).json({ userId: req.user.userId });
// });

// // Todo APIs
// app.get('/api/todos', async (req, res) => {
//     const userId = req.user?.userId; // Use optional chaining to avoid errors
//     try {
//       if (!userId) {
//         return res.status(401).json({ error: 'User ID not found' });
//       }
//       const todos = await Todo.find({ userId });
//       res.json(todos);
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch todos' });
//     }
//   });
  

// app.post('/api/todos', async (req, res) => {
//   const userId = req.user.userId; // This comes from verifyToken middleware
//   const { title, description } = req.body;
//   try {
//     const newTodo = new Todo({ userId, title, description });
//     await newTodo.save();
//     res.status(201).json(newTodo); // Return the newly created Todo object
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create todo' });
//   }
// });

// app.put('/api/todos/:id', async (req, res) => {
//   const userId = req.user.userId; // This comes from verifyToken middleware
//   const { id } = req.params;
//   const { title, description } = req.body;
//   try {
//     const updatedTodo = await Todo.findOneAndUpdate(
//       { _id: id, userId },
//       { title, description, updatedAt: Date.now() },
//       { new: true }
//     );
//     if (!updatedTodo) {
//       return res.status(404).json({ error: 'Todo not found or unauthorized' });
//     }
//     res.json(updatedTodo);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update todo' });
//   }
// });

// app.delete('/api/todos/:id', async (req, res) => {
//   const userId = req.user.userId; // This comes from verifyToken middleware
//   const { id } = req.params;
//   try {
//     const deletedTodo = await Todo.findOneAndDelete({ _id: id, userId });
//     if (!deletedTodo) {
//       return res.status(404).json({ error: 'Todo not found or unauthorized' });
//     }
//     res.json({ message: 'Todo deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete todo' });
//   }
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Internal Server Error' });
// });

// // Start Server
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
