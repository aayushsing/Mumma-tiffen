// Mumma Tiffin – Database Setup
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("mumma.db");

db.serialize(() => {
  // --- Create Tables ---
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      city TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL,
      meal_time TEXT,
      city TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      food_id INTEGER,
      address TEXT,
      pincode TEXT,
      landmark TEXT,
      meal_time TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Default Admins ---
  const admins = [
    {
      name: "Main Admin",
      email: "admin@mummatiffin.com",
      password: "admin123",
      city: "All",
      role: "admin",
    },
    {
      name: "Delhi Manager",
      email: "manager@mummatiffin.com",
      password: "manager123",
      city: "Delhi",
      role: "admin",
    },
  ];

  admins.forEach((a) => {
    const hash = bcrypt.hashSync(a.password, 10);
    db.run(
      "INSERT OR IGNORE INTO users (name, email, password, city, role) VALUES (?, ?, ?, ?, ?)",
      [a.name, a.email, hash, a.city, a.role]
    );
  });

  console.log("✅ Database setup complete. Default admins created.");
});

db.close();
