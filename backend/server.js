const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const app = express();

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
          ['testuser', 'testpassword'], (err) => {
            if (err) console.error('Error inserting user:', err.message);
          });
      }
    });
    db.run(`CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      headerTitle TEXT,
      headerSubtitle TEXT,
      collegeProgress TEXT,
      javaSkills TEXT,
      sqlSkills TEXT,
      footerText TEXT,
      projectTitle TEXT,
      projectSubtitle TEXT,
      projectDuration TEXT,
      projectDescription TEXT,
      projectDetails TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating profiles table:', err.message);
      } else {
        const profileData = {
          name: 'Allen',
          collegeProgress: [
            'Completed 60 credits toward my Computer Science degree',
            'Aced courses like Data Structures, Algorithms, and Web Development',
            'Currently working on a capstone project for a local business',
            'Maintaining a 3.8 GPA',
          ],
          javaSkills: [
            'Proficient in object-oriented programming',
            'Built invoice generation programs with formatted output',
            'Experienced with exception handling and file I/O',
            'Developed applications using JDBC for database connectivity',
          ],
          sqlSkills: [
            'Skilled in writing complex queries with joins and aggregations',
            'Created PL/SQL procedures for invoice generation',
            'Experienced with triggers and the EVENT-CONDITION-ACTION model',
            'Proficient in using cursors and prepared statements',
          ],
          headerTitle: 'Allen Mahdi',
          headerSubtitle: 'Software Developer',
          footerText: 'Footer',
          projectTitle: 'Motion-Controlled Kiosk System',
          projectSubtitle: 'Class Project – Computer Science Course, University of New Orleans',
          projectDuration: 'August 2024 – Present',
          projectDescription: 'Developing a user-friendly interface for a Raspberry Pi-based kiosk system enabling motionless hand interactions through LeetMotion technology.',
          projectDetails: [
            'Utilizing Python and LeetMotion for advanced gesture recognition capabilities.',
            'Focused on enhancing accessibility and user interaction in school environments.',
            'Collaborating in a team of 25 to design, test, and deploy the system across campus TVs.',
            'Emphasis on robust performance and usability in public-facing deployments.'
          ]
        };
        db.run(`INSERT OR REPLACE INTO profiles (username, name, headerTitle, headerSubtitle, collegeProgress, javaSkills, sqlSkills, footerText, projectTitle, projectSubtitle, projectDuration, projectDescription, projectDetails)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'testuser',
            profileData.name,
            profileData.headerTitle,
            profileData.headerSubtitle,
            JSON.stringify(profileData.collegeProgress),
            JSON.stringify(profileData.javaSkills),
            JSON.stringify(profileData.sqlSkills),
            profileData.footerText,
            profileData.projectTitle,
            profileData.projectSubtitle,
            profileData.projectDuration,
            profileData.projectDescription,
            JSON.stringify(profileData.projectDetails)
          ], (err) => {
            if (err) console.error('Error inserting default profile:', err.message);
          });
      }
    });
  }
});

const JWT_SECRET = 'your-secret-key';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Login API',
      version: '1.0.0',
      description: 'API for user authentication and profile management',
    },
    servers: [{ url: 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./server.js'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Log out a user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful logout
 *       401:
 *         description: Unauthorized
 */
app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // In a real app, you might invalidate the token server-side (e.g., blacklist it)
  // For JWT, client-side token removal is often sufficient
  res.json({ message: 'Logout successful' });
});

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
app.get('/api/profile', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  let username = 'testuser'; // Default to testuser if no token
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        username = decoded.username; // Use authenticated username if token is valid
      }
      fetchProfile(username, res);
    });
  } else {
    fetchProfile(username, res);
  }
});

function fetchProfile(username, res) {
  db.get(`SELECT * FROM profiles WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({
      name: row.name,
      headerTitle: row.headerTitle,
      headerSubtitle: row.headerSubtitle,
      collegeProgress: JSON.parse(row.collegeProgress || '[]'),
      javaSkills: JSON.parse(row.javaSkills || '[]'),
      sqlSkills: JSON.parse(row.sqlSkills || '[]'),
      footerText: row.footerText,
      projectTitle: row.projectTitle,
      projectSubtitle: row.projectSubtitle,
      projectDuration: row.projectDuration,
      projectDescription: row.projectDescription,
      projectDetails: JSON.parse(row.projectDetails || '[]'),
    });
  });
}

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               headerTitle: { type: string }
 *               headerSubtitle: { type: string }
 *               collegeProgress: { type: array, items: { type: string } }
 *               javaSkills: { type: array, items: { type: string } }
 *               sqlSkills: { type: array, items: { type: string } }
 *               footerText: { type: string }
 *               projectTitle: { type: string }
 *               projectSubtitle: { type: string }
 *               projectDuration: { type: string }
 *               projectDescription: { type: string }
 *               projectDetails: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.put('/api/profile', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const {
      name, headerTitle, headerSubtitle, collegeProgress, javaSkills, sqlSkills,
      footerText, projectTitle, projectSubtitle, projectDuration, projectDescription, projectDetails
    } = req.body;
    db.run(
      `UPDATE profiles SET name = ?, headerTitle = ?, headerSubtitle = ?, collegeProgress = ?, javaSkills = ?, sqlSkills = ?, footerText = ?, projectTitle = ?, projectSubtitle = ?, projectDuration = ?, projectDescription = ?, projectDetails = ? WHERE username = ?`,
      [
        name, headerTitle, headerSubtitle, JSON.stringify(collegeProgress || []),
        JSON.stringify(javaSkills || []), JSON.stringify(sqlSkills || []),
        footerText, projectTitle, projectSubtitle, projectDuration, projectDescription,
        JSON.stringify(projectDetails || []), decoded.username
      ],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Profile updated' });
      }
    );
  });
});

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
  console.log('Swagger docs at http://localhost:5000/api-docs');
});