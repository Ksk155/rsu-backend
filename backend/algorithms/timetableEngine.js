// backend/engine/timetableEngine.js

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// --------------------------------------------------
// ✅ Helper: detect courses that ONLY open on Monday
// --------------------------------------------------
function hasMondayOnlyCourse(groups) {
  return Object.values(groups).some(options =>
    options.every(o => o.day === "MON")
  );
}

// --------------------------------------------------
// ✅ Preference score (SOFT constraints)
// --------------------------------------------------
function preferenceScore(slot, preferences) {
  let score = 0;

  // prefer time
  if (preferences?.prefer_time === "Morning" && slot.start_time < "12:00:00") {
    score += 5;
  }
  if (preferences?.prefer_time === "Afternoon" && slot.start_time >= "12:00:00") {
    score += 5;
  }

  return score;
}

// --------------------------------------------------
// ✅ Extra score: compactness + avoid Monday (soft)
// --------------------------------------------------
function extraScore(timetable, preferences, forceAllowMonday) {
  let score = 0;

  // avoid Monday ONLY if:
  // - student wants it
  // - NOT forced by Monday-only course
  if (preferences?.avoid_monday && !forceAllowMonday) {
    const hasMonday = timetable.some(t => t.day === "MON");
    if (hasMonday) score -= 10;
  }

  // compactness (small gaps bonus)
  const byDay = {};
  timetable.forEach(t => {
    if (!byDay[t.day]) byDay[t.day] = [];
    byDay[t.day].push(t);
  });

  Object.values(byDay).forEach(daySlots => {
    daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 0; i < daySlots.length - 1; i++) {
      if (daySlots[i + 1].start_time === daySlots[i].end_time) {
        score += 2; // compact bonus
      }
    }
  });

  return score;
}

// --------------------------------------------------
// ✅ Conflict detection
// --------------------------------------------------
function hasConflict(timetable, slot) {
  return timetable.some(t =>
    t.day === slot.day &&
    !(slot.end_time <= t.start_time || slot.start_time >= t.end_time)
  );
}

// --------------------------------------------------
// ✅ Main Hybrid Generator
// --------------------------------------------------
function runHybridAlgorithm(meetings, preferences) {
  // group by course
  const groups = {};
  meetings.forEach(m => {
    if (!groups[m.course_code]) groups[m.course_code] = [];
    groups[m.course_code].push(m);
  });

  const courseCodes = Object.keys(groups);
  const forceAllowMonday = hasMondayOnlyCourse(groups);

  let bestScore = -Infinity;
  let bestTimetable = null;

  function dfs(index, current) {
    if (index === courseCodes.length) {
      const score =
        current.reduce((s, c) => s + preferenceScore(c, preferences), 0) +
        extraScore(current, preferences, forceAllowMonday);

      if (score > bestScore) {
        bestScore = score;
        bestTimetable = [...current];
      }
      return;
    }

    const code = courseCodes[index];
    for (const option of shuffle(groups[code])) {
      if (hasConflict(current, option)) continue;

      current.push(option);
      dfs(index + 1, current);
      current.pop();
    }
  }

  dfs(0, []);

  if (!bestTimetable) {
    throw new Error("No valid timetable found");
  }

  return bestTimetable;
}

module.exports = {
  runHybridAlgorithm
};
