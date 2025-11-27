// backend/routes/studentPlan.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    // -------------------------------
    // 1. GET student info
    // -------------------------------
    const [[student]] = await pool.query(
      "SELECT full_name, major FROM students WHERE student_id = ?",
      [student_id]
    );

    // -------------------------------
    // 2. GET preferences
    // -------------------------------
    const [[prefs]] = await pool.query(
      "SELECT avoid_monday, prefer_time FROM preferences WHERE student_id = ?",
      [student_id]
    );

    // -------------------------------
    // 3. GET student selected courses
    // -------------------------------
    const [selectedCourses] = await pool.query(
      `
      SELECT 
        sc.course_code,
        c.course_name AS full_course_name,
        c.credits
      FROM student_courses sc
      LEFT JOIN courses c 
        ON sc.course_code = c.course_code
      WHERE sc.student_id = ?
    `,
      [student_id]
    );

    // -------------------------------
    // 4. Get all meeting options per selected course
    // -------------------------------
    const [meetingOptions] = await pool.query(
      `
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
      WHERE mo.course_code IN (
        SELECT course_code FROM student_courses WHERE student_id = ?
      )
      ORDER BY 
        FIELD(mo.day, 'MON','TUE','WED','THU','FRI','SAT'),
        mo.start_time
    `,
      [student_id]
    );

    // -------------------------------
    // FINAL RESPONSE
    // -------------------------------
    res.json({
      student_id,
      full_name: student?.full_name ?? "",
      major: student?.major ?? "",
      avoid_monday: prefs?.avoid_monday ?? 0,
      prefer_time: prefs?.prefer_time ?? "",
      selected_courses: selectedCourses,
      meeting_options: meetingOptions
    });

  } catch (err) {
    console.error("Error loading student plan:", err);
    res.status(500).json({ error: "Failed to load student plan" });
  }
});

module.exports = router;
