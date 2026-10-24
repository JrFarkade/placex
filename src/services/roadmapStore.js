// PlaceX Roadmap Progress & Curriculum Store
// Faithful port of backend/app/learning_engine/services/learning_service.py
import { ROADMAP_DATA } from '../data/roadmapData.js';

// Map of user roadmap progress: key = `${branch}::${level}` -> { completed: Set, in_progress: Set }
const userProgressMap = new Map();

export function getRoadmapBranches() {
  const branches = Object.keys(ROADMAP_DATA);
  return {
    branches: ["None / Not Selected", ...branches],
    levels: ["Beginner", "Intermediate", "Advanced"],
    default_branch: "Computer Science / Software Development",
    default_level: "Beginner"
  };
}

export function getRoadmapPath(branch = "Computer Science / Software Development", level = "Beginner") {
  const allBranches = Object.keys(ROADMAP_DATA);

  if (!branch || branch === "None / Not Selected") {
    return {
      branch: "None / Not Selected",
      level: level || "Beginner",
      total_weeks: 0,
      completed_count: 0,
      in_progress_count: 0,
      progress_pct: 0.0,
      weeks: [],
      readiness: null,
      available_branches: ["None / Not Selected", ...allBranches],
      available_levels: ["Beginner", "Intermediate", "Advanced"]
    };
  }

  const selectedBranch = ROADMAP_DATA[branch] ? branch : allBranches[0];
  const selectedLevel = (level && ["Beginner", "Intermediate", "Advanced"].includes(level)) ? level : "Beginner";

  const rawWeeks = ROADMAP_DATA[selectedBranch]?.[selectedLevel] || [];
  const key = `${selectedBranch}::${selectedLevel}`;
  const progress = userProgressMap.get(key) || { completed: new Set(), in_progress: new Set() };

  let completedCount = 0;
  let inProgressCount = 0;

  const processedWeeks = rawWeeks.map(w => {
    const wkNum = w.week;
    let status = "Not Started";
    if (progress.completed.has(wkNum)) {
      status = "Completed";
      completedCount++;
    } else if (progress.in_progress.has(wkNum)) {
      status = "In Progress";
      inProgressCount++;
    }

    return {
      week: wkNum,
      title: w.topic,
      difficulty: w.difficulty,
      priority: w.priority,
      prerequisites: w.prerequisites,
      completion_criteria: w.completion_criteria,
      status: status,
      topics: [w.topic, "Core Implementation", "Edge Cases", "Interview Practice"],
      estimated_hours: 12
    };
  });

  const totalWeeks = processedWeeks.length;
  const progressPct = totalWeeks > 0 ? Math.round((completedCount / totalWeeks) * 1000) / 10 : 0.0;

  return {
    branch: selectedBranch,
    level: selectedLevel,
    total_weeks: totalWeeks,
    completed_count: completedCount,
    in_progress_count: inProgressCount,
    progress_pct: progressPct,
    weeks: processedWeeks,
    readiness: {
      readiness_score: Math.min(100, Math.round(50 + (completedCount / Math.max(1, totalWeeks)) * 45)),
      readiness_level: completedCount >= 18 ? "Tier 1 Placement Ready" : completedCount >= 10 ? "Competent" : "Foundational"
    },
    available_branches: allBranches,
    available_levels: ["Beginner", "Intermediate", "Advanced"]
  };
}

export function updateWeekStatus(branch, level, weekNum, status) {
  const selectedBranch = ROADMAP_DATA[branch] ? branch : "Computer Science / Software Development";
  const selectedLevel = (level && ["Beginner", "Intermediate", "Advanced"].includes(level)) ? level : "Beginner";
  const key = `${selectedBranch}::${selectedLevel}`;

  let progress = userProgressMap.get(key);
  if (!progress) {
    progress = { completed: new Set(), in_progress: new Set() };
    userProgressMap.set(key, progress);
  }

  // Remove from both
  progress.completed.delete(weekNum);
  progress.in_progress.delete(weekNum);

  if (status === "Completed") {
    progress.completed.add(weekNum);
  } else if (status === "In Progress") {
    progress.in_progress.add(weekNum);
  }

  return {
    status: "ok",
    message: `Week ${weekNum} marked as ${status}`,
    branch: selectedBranch,
    level: selectedLevel,
    week_num: weekNum,
    new_status: status
  };
}
