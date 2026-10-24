// PlaceX Authentic Activity Store & Dashboard Calculation Engine
// Faithful port of backend/app/services/dashboard_service.py

// In-memory persistent activity map keyed by 'YYYY-MM-DD'
export const studentActivityMap = new Map();

// Helper to get ISO date string for UTC
export function getIsoDate(dateObj = new Date()) {
  return dateObj.toISOString().slice(0, 10);
}

// Record qualifying activity (login, quiz submission, coding execution, resume upload)
export function recordStudentActivity(dateStr = getIsoDate(), isLogin = false, isLearning = false, eventType = "general") {
  const existing = studentActivityMap.get(dateStr) || { actions_count: 0, login_count: 0, events: [] };
  if (isLogin) {
    existing.login_count += 1;
  }
  if (isLearning || !isLogin) {
    existing.actions_count += 1;
  }
  existing.events.push({ type: eventType, timestamp: new Date().toISOString() });
  studentActivityMap.set(dateStr, existing);
  return existing;
}

// Compute dynamic 7-day tracker and 60-day heatmap matching DashboardService
export function getDashboardActivity(refDate = new Date()) {
  const now = new Date(refDate);
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  const todayStr = getIsoDate(now);

  const daysNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Check which dates have actual recorded activity
  const activeDatesSet = new Set();
  const learningDatesSet = new Set();

  for (const [dateStr, act] of studentActivityMap.entries()) {
    if (act.actions_count > 0 || act.login_count > 0) {
      activeDatesSet.add(dateStr);
    }
    if (act.actions_count > 0) {
      learningDatesSet.add(dateStr);
    }
  }

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(now);
  let checkStr = getIsoDate(checkDate);

  if (!activeDatesSet.has(checkStr)) {
    // Check if user was active yesterday
    const yest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const yestStr = getIsoDate(yest);
    if (activeDatesSet.has(yestStr)) {
      checkDate = yest;
      checkStr = yestStr;
    }
  }

  while (activeDatesSet.has(checkStr)) {
    currentStreak++;
    checkDate = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate() - 1));
    checkStr = getIsoDate(checkDate);
  }

  // Calculate longest streak
  let longestStreak = currentStreak;
  if (activeDatesSet.size > 0) {
    const sortedDates = Array.from(activeDatesSet).sort();
    let runningStreak = 0;
    let prev = null;
    for (const dStr of sortedDates) {
      const d = new Date(dStr);
      if (prev === null) {
        runningStreak = 1;
      } else {
        const diffDays = Math.round((d - prev) / 86400000);
        if (diffDays === 1) {
          runningStreak++;
        } else {
          runningStreak = 1;
        }
      }
      if (runningStreak > longestStreak) longestStreak = runningStreak;
      prev = d;
    }
  }

  // Build 7-day Tracker for Monday-Sunday of CURRENT week
  const sevenDays = [];
  let daysActiveThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
    const dateStr = getIsoDate(d);
    const dayNumber = d.getUTCDate();
    const monthStr = monthNames[d.getUTCMonth()];
    const formattedDate = `${dayNumber} ${monthStr}`;

    const isToday = dateStr === todayStr;
    const isUpcoming = dateStr > todayStr;
    const isActive = activeDatesSet.has(dateStr);
    const isMissed = dateStr < todayStr && !isActive;
    const hasLearning = learningDatesSet.has(dateStr);

    if (isActive) {
      daysActiveThisWeek++;
    }

    let status = "upcoming";
    if (isActive) {
      status = "completed";
    } else if (isToday) {
      status = "today";
    } else if (isMissed) {
      status = "missed";
    }

    const activityData = studentActivityMap.get(dateStr) || { actions_count: 0, login_count: 0 };

    sevenDays.push({
      day_abbr: daysNames[i],
      day_full: fullNames[i],
      date: dateStr,
      day_number: dayNumber,
      formatted_date: formattedDate,
      is_active: isActive,
      has_learning: hasLearning,
      is_today: isToday,
      is_upcoming: isUpcoming,
      is_missed: isMissed,
      status: status,
      actions_count: activityData.actions_count,
      login_count: activityData.login_count
    });
  }

  // 60-Day Calendar Heatmap
  const calendarDays = [];
  const startMonday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() - 56));
  const endSunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));

  let curr = new Date(startMonday);
  while (curr <= endSunday) {
    const currStr = getIsoDate(curr);
    const isPast = currStr < todayStr;
    const isToday = currStr === todayStr;
    const isFuture = currStr > todayStr;

    const actData = studentActivityMap.get(currStr);
    const cnt = actData ? (actData.actions_count + actData.login_count) : 0;

    let level = 0;
    if (cnt === 1) level = 1;
    else if (cnt <= 3 && cnt > 1) level = 2;
    else if (cnt <= 6 && cnt > 3) level = 3;
    else if (cnt > 6) level = 4;

    calendarDays.push({
      date: currStr,
      count: cnt,
      level: level,
      is_today: isToday,
      is_future: isFuture
    });

    curr = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate() + 1));
  }

  let motivationalMessage = "Keep your momentum going! Complete a task today to advance your placement preparation.";
  if (daysActiveThisWeek === 7) {
    motivationalMessage = "Outstanding dedication! You completed a perfect 7-day streak this week.";
  } else if (currentStreak >= 5) {
    motivationalMessage = `You are on fire! ${currentStreak} consecutive active days. Keep building momentum!`;
  } else if (activeDatesSet.has(todayStr)) {
    motivationalMessage = "Great job! You have logged activity today. Practice another problem or interview to level up!";
  } else {
    motivationalMessage = "Keep your streak alive! Complete a coding problem or take a quiz to log today's activity.";
  }

  return {
    current_streak: currentStreak,
    longest_streak: Math.max(longestStreak, currentStreak),
    active_days_this_week: daysActiveThisWeek,
    total_active_days: activeDatesSet.size,
    seven_day_tracker: sevenDays,
    motivational_message: motivationalMessage,
    calendar: calendarDays
  };
}
