require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "campusbite-local-demo-secret-change-me";
const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please sign in first." });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Session expired. Please sign in again." }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access only." });
  next();
}
function safeUser(user) {
  return { _id: user._id, name: user.name, email: user.email, role: user.role };
}

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "CampusBite API" }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6)
    return res.status(400).json({ message: "Name, email and password (minimum 6 characters) are required." });
  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some(u => u.email === normalizedEmail)) return res.status(409).json({ message: "An account with this email already exists." });
  const user = { _id: `u-${Date.now()}`, name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10), role: "student" };
  db.users.push(user); writeDB(db);
  res.status(201).json({ user: safeUser(user), token: makeToken(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, role = "student" } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
  const db = readDB(); const user = db.users.find(u => u.email === email.trim().toLowerCase());
  if (!user || user.role !== role || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ message: "Invalid email, password, or selected role." });
  res.json({ user: safeUser(user), token: makeToken(user) });
});

app.get("/api/foods", (req, res) => res.json(readDB().foods));
app.post("/api/foods", auth, adminOnly, (req, res) => {
  const { name, price, category, emoji, description } = req.body || {};
  if (!name?.trim() || !Number(price) || Number(price) < 1 || !category) return res.status(400).json({ message: "Valid name, price and category are required." });
  const db = readDB(); const food = { _id: `f-${Date.now()}`, name: name.trim(), price: Number(price), category, emoji: emoji || "🍽️", description: description || "" };
  db.foods.unshift(food); writeDB(db); res.status(201).json(food);
});
app.put("/api/foods/:id", auth, adminOnly, (req, res) => {
  const db = readDB(); const idx = db.foods.findIndex(f => f._id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: "Food item not found." });
  const { name, price, category, emoji, description } = req.body || {};
  if (!name?.trim() || !Number(price) || Number(price) < 1 || !category) return res.status(400).json({ message: "Valid name, price and category are required." });
  db.foods[idx] = { ...db.foods[idx], name: name.trim(), price: Number(price), category, emoji: emoji || "🍽️", description: description || "" };
  writeDB(db); res.json(db.foods[idx]);
});
app.delete("/api/foods/:id", auth, adminOnly, (req, res) => {
  const db = readDB(); const before = db.foods.length;
  db.foods = db.foods.filter(f => f._id !== req.params.id);
  if (db.foods.length === before) return res.status(404).json({ message: "Food item not found." });
  writeDB(db); res.json({ message: "Food item deleted." });
});

app.post("/api/orders", auth, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ message: "Only students can place orders." });
  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: "Your cart is empty." });
  const db = readDB(); const orderItems = [];
  for (const row of items) {
    const food = db.foods.find(f => f._id === row.foodId);
    const qty = Number(row.qty);
    if (!food || !Number.isInteger(qty) || qty < 1 || qty > 50) return res.status(400).json({ message: "An item or quantity in your cart is invalid." });
    orderItems.push({ foodId: food._id, name: food.name, emoji: food.emoji, price: food.price, qty });
  }
  const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const order = { _id: `o-${Date.now()}`, studentId: req.user.id, studentName: req.user.name, createdAt: new Date().toISOString(), items: orderItems, total, status: "Placed" };
  db.orders.unshift(order); writeDB(db); res.status(201).json(order);
});
app.get("/api/orders/my", auth, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ message: "Student access only." });
  res.json(readDB().orders.filter(o => o.studentId === req.user.id));
});
app.get("/api/orders", auth, adminOnly, (req, res) => res.json(readDB().orders));
app.patch("/api/orders/:id/status", auth, adminOnly, (req, res) => {
  const allowed = ["Placed", "Preparing", "Ready", "Collected"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  const db = readDB(); const order = db.orders.find(o => o._id === req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });
  order.status = req.body.status; writeDB(db); res.json(order);
});

app.use((req, res) => res.status(404).json({ message: "API endpoint not found." }));
async function ensureDemoAdmin() {
  const db = readDB();
  let admin = db.users.find(u => u.email === "admin@campusbite.com" && u.role === "admin");
  const valid = admin && await bcrypt.compare("Admin@123", admin.passwordHash).catch(() => false);
  if (!valid) {
    if (!admin) {
      admin = { _id: "admin-seed", name: "Campus Admin", email: "admin@campusbite.com", role: "admin" };
      db.users.push(admin);
    }
    admin.passwordHash = await bcrypt.hash("Admin@123", 10);
    writeDB(db);
  }
}
ensureDemoAdmin().then(() => app.listen(PORT, () => console.log(`🍊 CampusBite API running at http://localhost:${PORT}`))).catch(err => {
  console.error("Could not initialize CampusBite database", err);
  process.exit(1);
});
