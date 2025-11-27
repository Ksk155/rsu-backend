// backend/routes/studentCourses.js
const express = require("express");
const router = express.Router();
const { query } = require("../db");

// -------------------------------------------------------------
// GET: Load selected courses for a student
// Endpoint: GET /api/student_courses/:student_id
// -------------------------------------------------------------
router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    const rows = await query(
      "SELECT course_code FROM student_courses WHERE student_id = ?",
      [student_id]
    );

    const list = rows.map(r => r.course_code);

    res.json({ status: "ok", selected: list });
  } catch (err) {
    console.error("GET /student_courses error:", err);
    res.status(500).json({ error: "Failed to load student courses" });
  }
});

// -------------------------------------------------------------
// POST: Save selected courses
// FRONTEND sends:
// { student_id: "...", courses: ["ICT101", "ENG101"] }
// Endpoint: POST /api/student_courses
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { student_id, courses } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }
    if (!Array.isArray(courses)) {
      return res.status(400).json({ error: "courses must be an array" });
    }

    // Remove old selections
    await query("DELETE FROM student_courses WHERE student_id = ?", [
      student_id,
    ]);

    // Insert new ones
    for (const code of courses) {
      await query(
        "INSERT INTO student_courses (student_id, course_code) VALUES (?, ?)",
        [student_id, code]
      );
    }

    res.json({ status: "ok", message: "saved" });
  } catch (err) {
    console.error("POST /student_courses error:", err);
    res.status(500).json({ error: "Failed to save student courses" });
  }
});

module.exports = router;
