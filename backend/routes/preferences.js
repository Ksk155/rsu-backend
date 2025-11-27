const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// ========================================================
// GET /api/preferences/:student_id
// ========================================================
router.get("/:student_id", async (req, res) => {
  const { student_id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT student_id, avoid_monday, prefer_time FROM preferences WHERE student_id = ?",
      [student_id]
    );

    if (rows.length === 0) {
      return res.json({
        student_id,
        avoid_monday: 0,
        prefer_time: "",
        status: "empty"
      });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("GET preferences error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ========================================================
// POST /api/preferences  (create/update)
// ========================================================
router.post("/", async (req, res) => {
  const { student_id, avoid_monday, prefer_time } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "Missing student_id" });
  }

  try {
    // Check existing record
    const [exists] = await pool.query(
      "SELECT student_id FROM preferences WHERE student_id = ?",
      [student_id]
    );

    if (exists.length === 0) {
      // INSERT
      await pool.query(
        "INSERT INTO preferences (student_id, avoid_monday, prefer_time) VALUES (?, ?, ?)",
        [student_id, avoid_monday, prefer_time]
      );
      return res.json({ status: "created" });
    }

    // UPDATE
    await pool.query(
      "UPDATE preferences SET avoid_monday = ?, prefer_time = ? WHERE student_id = ?",
      [avoid_monday, prefer_time, student_id]
    );

    return res.json({ status: "updated" });

  } catch (err) {
    console.error("POST preferences error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
