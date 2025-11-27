// backend/routes/schedule.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================
// GET FULL SEMESTER TIMETABLE
// =====================================
router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT 
        mo.meeting_id,
        mo.course_code,
        mo.full_course_name,
        mo.section_code,
        mo.day,
        mo.start_time,
        mo.end_time,
        mo.room,
        mo.instructor,
        c.credits
      FROM meeting_options mo
      LEFT JOIN courses c 
        ON mo.course_code = c.course_code
      ORDER BY 
        FIELD(mo.day, 'MON','TUE','WED','THU','FRI','SAT'),
        mo.start_time
    `;

    const rows = await db.query(sql);
    return res.json(rows);

  } catch (err) {
    console.error("Error loading full schedule:", err);
    res.status(500).json({ error: "Failed to load semester schedule" });
  }
});

module.exports = router;
