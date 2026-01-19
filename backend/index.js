const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express(); // ⭐ ต้องมีบรรทัดนี้

app.use(cors());
app.use(express.json()); // ⭐ สำคัญมาก

app.get("/", (req, res) => {
  res.send("Backend OK");
});

app.post("/post", async (req, res) => {
  console.log("BODY:", req.body);

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    await pool.query(
      "INSERT INTO posts (message) VALUES ($1)",
      [message]
    );

    res.json({ status: "saved" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

app.listen(8000, () => {
  console.log("Server running on port 8000");
});
