const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

app.post("/post", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    // 1️⃣ บันทึกลง DB ก่อน
    const dbResult = await pool.query(
      "INSERT INTO posts (message, status) VALUES ($1, $2) RETURNING *",
      [message, "draft"]
    );

    const post = dbResult.rows[0];

    // 2️⃣ โพสขึ้น Facebook Page
    const fbRes = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PAGE_ID}/feed`,
      {
        message: message,
        access_token: process.env.PAGE_TOKEN,
      }
    );

    // 3️⃣ อัปเดตสถานะ
    await pool.query(
      "UPDATE posts SET status='posted', facebook_post_id=$1, posted_at=NOW() WHERE id=$2",
      [fbRes.data.id, post.id]
    );

    res.json({
      success: true,
      facebook_post_id: fbRes.data.id,
    });
  } catch (err) {
    console.error("FB ERROR:", err.response?.data || err.message);

    await pool.query(
      "UPDATE posts SET status='error', error_message=$1 WHERE id=$2",
      [JSON.stringify(err.response?.data || err.message), post.id]
    );

    res.status(500).json({
      error: "Facebook post failed",
      detail: err.response?.data || err.message,
    });
  }
});

app.listen(8000, () => {
  console.log("Server running on port 8000");
});

app.get("/test-fb", async (req, res) => {
  const fbRes = await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PAGE_ID}/feed`,
    {
      message: "ทดสอบโพสตรงจาก backend",
      access_token: process.env.PAGE_TOKEN,
    }
  );

  res.json(fbRes.data);
});

console.log("PAGE:", process.env.PAGE_ID);
console.log("TOKEN:", process.env.PAGE_TOKEN?.slice(0, 10));