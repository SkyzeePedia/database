const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const ADMIN_KEY = "SkyPeler";
const USER_KEY = "JanganRusuh";

const DB_PATH = path.join(__dirname, 'database.json');

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/', express.static(path.join(__dirname, 'public')));

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { numbers: [], logs: [] };
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function isValidNumber(num) {
  return typeof num === 'string' && /^62\d{6,15}$/.test(num);
}

app.post('/key-login', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ success: false, message: 'Key required' });
  if (key === ADMIN_KEY) return res.json({ success: true, role: 'admin' });
  if (key === USER_KEY) return res.json({ success: true, role: 'user' });
  res.status(401).json({ success: false, message: 'Invalid key' });
});

app.get('/api/list', (req, res) => {
  res.json({ success: true, numbers: readDB().numbers });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const db = readDB();
  const filtered = q ? db.numbers.filter(n => n.includes(q)) : db.numbers;
  res.json({ success: true, numbers: filtered });
});

app.post('/api/add', (req, res) => {
  const { key, number } = req.body;
  if (!key || !number) return res.status(400).json({ success: false, message: 'key and number required' });
  if (key !== ADMIN_KEY && key !== USER_KEY) return res.status(401).json({ success: false, message: 'Invalid key' });

  const normalized = number.replace(/\s+/g, '');
  if (!isValidNumber(normalized)) return res.status(400).json({ success: false, message: 'Invalid number format' });

  const db = readDB();
  if (db.numbers.includes(normalized)) return res.status(409).json({ success: false, message: 'Number already exists' });

  db.numbers.push(normalized);
  db.logs.unshift({ action: 'add', by: key === ADMIN_KEY ? 'admin' : 'user', number: normalized, ts: new Date().toISOString() });
  writeDB(db);
  res.json({ success: true, message: 'Number added', number: normalized });
});

app.post('/api/delete', (req, res) => {
  const { key, number } = req.body;
  if (!key || !number) return res.status(400).json({ success: false, message: 'key and number required' });
  if (key !== ADMIN_KEY) return res.status(403).json({ success: false, message: 'Only admin can delete' });

  const normalized = number.replace(/\s+/g, '');
  if (!isValidNumber(normalized)) return res.status(400).json({ success: false, message: 'Invalid number format' });

  const db = readDB();
  const idx = db.numbers.indexOf(normalized);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Number not found' });

  db.numbers.splice(idx, 1);
  db.logs.unshift({ action: 'delete', by: 'admin', number: normalized, ts: new Date().toISOString() });
  writeDB(db);
  res.json({ success: true, message: 'Number deleted', number: normalized });
});

app.get('/api/logs', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (key !== ADMIN_KEY) return res.status(403).json({ success: false, message: 'Only admin can view logs' });
  res.json({ success: true, logs: readDB().logs });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

module.exports = app;