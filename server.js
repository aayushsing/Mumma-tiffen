// Mumma Tiffin – Multi-Admin Backend
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const SECRET = process.env.JWT_SECRET || "mummasecret";
const db = new sqlite3.Database("mumma.db");

// --- Middleware ---
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token" });
  jwt.verify(token.split(" ")[1], SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// --- Auth Routes ---
app.post("/api/register", (req, res) => {
  const { name, email, password, city, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  db.run(
    "INSERT INTO users (name, email, password, city, role) VALUES (?, ?, ?, ?, ?)",
    [name, email, hash, city, role || "user"],
    (err) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: "User registered" });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err || !user) return res.status(400).json({ message: "User not found" });
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: "Wrong password" });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, city: user.city },
      SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token, user });
  });
});

// --- Food Management (Admin only) ---
app.get("/api/foods", (req, res) => {
  db.all("SELECT * FROM foods", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post("/api/foods", verifyToken, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  const { name, description, price, meal_time, city } = req.body;
  db.run(
    "INSERT INTO foods (name, description, price, meal_time, city) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, meal_time, city],
    function (err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID, message: "Food added" });
    }
  );
});

// --- Orders ---
app.post("/api/orders", verifyToken, (req, res) => {
  const { food_id, address, pincode, landmark, meal_time } = req.body;
  db.run(
    "INSERT INTO orders (user_id, food_id, address, pincode, landmark, meal_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, food_id, address, pincode, landmark, meal_time, "Pending"],
    function (err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID, message: "Order placed" });
    }
  );
});

app.get("/api/orders", verifyToken, (req, res) => {
  if (req.user.role === "admin") {
    db.all("SELECT * FROM orders", [], (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    });
  } else {
    db.all(
      "SELECT * FROM orders WHERE user_id = ?",
      [req.user.id],
      (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
      }
    );
  }
});

app.put("/api/orders/:id/status", verifyToken, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  const { status } = req.body;
  db.run(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, req.params.id],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ message: "Status updated" });
    }
  );
});

// --- Notifications (Admin) ---
app.get("/api/notifications", (req, res) => {
  db.all("SELECT * FROM notifications ORDER BY created_at DESC", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post("/api/notifications", verifyToken, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  const { message } = req.body;
  db.run("INSERT INTO notifications (message) VALUES (?)", [message], function (err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ id: this.lastID, message: "Notification added" });
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Mumma Tiffin running on port ${PORT}`));
