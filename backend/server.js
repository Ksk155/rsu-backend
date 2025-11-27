// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { pool } = require("./db");

// Routers
const courseRoutes = require("./routes/courses");
const studentCourseRoutes = require("./routes/studentCourses");
const preferenceRoutes = require("./routes/preferences");
const scheduleRoutes = require("./routes/schedule");
const studentPlanRoutes = require("./routes/studentPlan");

// Hybrid algorithm
const { runHybridAlgorithm } = require("./algorithms/timetableEngine");

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/courses", courseRoutes);
app.use("/api/student_courses", studentCourseRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/student-plan", studentPlanRoutes);

// =========================================================
// HYBRID OPTIMIZER (GA + SA + Strict Preferences)
// =========================================================
app.get("/api/optimize_hybrid/:student_id", async (req, res) => {
    const student_id = req.params.student_id;

    try {
        // ----------------------------------------------------
        // 1) SELECTED COURSES
        // ----------------------------------------------------
        const [selected] = await pool.query(
            "SELECT course_code FROM student_courses WHERE student_id = ?",
            [student_id]
        );

        if (selected.length === 0) {
            return res.json({ error: "Student has no selected courses." });
        }

        const courseList = selected.map(r => r.course_code);

        // ----------------------------------------------------
        // 2) MEETING OPTIONS (FIXED — NOW RETURNS course_name + credits)
        // ----------------------------------------------------
        const placeholders = courseList.map(() => "?").join(",");
        const [meetingOptions] = await pool.query(
            `
            SELECT 
                mo.meeting_id,
                mo.course_code,
                c.course_name,     -- FIXED: real course name
                c.credits,         -- FIXED: course credits
                mo.section_code,
                mo.day,
                mo.start_time,
                mo.end_time,
                mo.room,
                mo.instructor
            FROM meeting_options mo
            LEFT JOIN courses c 
                ON mo.course_code = c.course_code
            WHERE mo.course_code IN (${placeholders})
            ORDER BY 
                mo.course_code,
                mo.section_code,
                FIELD(mo.day, 'MON','TUE','WED','THU','FRI','SAT'),
                mo.start_time
            `,
            courseList
        );

        if (meetingOptions.length === 0) {
            return res.json({ error: "No meeting options found." });
        }

        // ----------------------------------------------------
        // 3) PREFERENCES (avoid_monday + prefer_time)
        // ----------------------------------------------------
        const [pref] = await pool.query(
            `
            SELECT avoid_monday, prefer_time
            FROM preferences
            WHERE student_id = ?
            `,
            [student_id]
        );

        let preferences = null;
        if (pref.length > 0) {
            preferences = {
                avoid_monday: pref[0].avoid_monday,
                prefer_time: pref[0].prefer_time
            };
        }

        // ----------------------------------------------------
        // 4) RUN HYBRID ALGORITHM (updated version)
        // ----------------------------------------------------
        const result = runHybridAlgorithm(meetingOptions, preferences);

        return res.json({
            status: "ok",
            student_id,
            timetable: result,
            preference: preferences || null
        });

    } catch (err) {
        console.error("Hybrid error:", err);
        return res.status(500).json({
            error: "Hybrid optimization failed.",
            message: err.message
        });
    }
});

// ---------------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
