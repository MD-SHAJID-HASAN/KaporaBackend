// src/db.js
import { Low, JSONFile } from "lowdb";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, "db.json"); // JSON file to store data
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();
db.data ||= {
  users: [],
  categories: [],
  products: [],
  orders: [],
  cart: [],
  payments: [],
  videos: [],
};

export default db;