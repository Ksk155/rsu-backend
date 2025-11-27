// backend/routes/courses.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/courses
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT course_code AS course_id, course_name, credits AS credit FROM courses ORDER BY course_code"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/courses error:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

module.exports = router;
