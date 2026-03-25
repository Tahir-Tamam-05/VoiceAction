import { Note } from '../types';

export function calculateStreak(items: Note[]): number {
  const days = [...new Set(
    items.map(i => new Date(i.createdAt).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (!days.length) return 0;

  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  // Check if today or yesterday has a note to start/continue the streak
  const firstDay = new Date(days[0]);
  firstDay.setHours(0, 0, 0, 0);
  const diffToToday = Math.round((current.getTime() - firstDay.getTime()) / 86400000);
  
  if (diffToToday > 1) return 0; // Streak broken

  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i]);
    d.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(current);
    expectedDate.setDate(current.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    // If the first day in the list is yesterday, we need to adjust the comparison
    if (i === 0 && diffToToday === 1) {
       // Streak is still active if yesterday had a note
    }

    // This is a simplified streak logic: consecutive days in the sorted list
    // We need to check if each day is exactly one day before the previous one in the streak
    if (i === 0) {
      streak = 1;
    } else {
      const prevDay = new Date(days[i-1]);
      prevDay.setHours(0, 0, 0, 0);
      const diff = Math.round((prevDay.getTime() - d.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
}
