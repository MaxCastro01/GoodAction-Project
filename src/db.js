const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');
const isTest = process.env.NODE_ENV === 'test';

let data = { users: [], donaciones: [], instituciones: [] };

function load() {
  if (isTest) return;
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
      data = { users: [], donaciones: [], instituciones: [] };
    }
  } else {
    save();
  }
}

function save() {
  if (isTest) return;
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

load();

module.exports = { data, save };
