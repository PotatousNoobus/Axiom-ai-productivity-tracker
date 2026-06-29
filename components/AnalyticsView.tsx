"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Flame, Zap, BarChart2, Brain, CalendarDays } from "lucide-react";
import { Task } from "./DailyTimeline";

export default function AnalyticsView() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let startHour = data.startHour;
        if (data.startTime) {
          startHour = parseInt(data.startTime.split(':')[0], 10);
        }
        return {
          id: docSnap.id,
          title: data.title || "Untitled",
          startTime: data.startTime,
          startHour: startHour || 9,
          endHour: data.endHour || 10,
          type: data.type || "focused",
          completed: !!data.completed,
          completedAt: data.completedAt,
          energyRequired: data.energyRequired,
        } as Task;
      });
      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, []);

  // Calculate Streak
  const calculateStreak = () => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    const dates = new Set<string>();
    completedTasks.forEach(t => {
      if (t.completedAt) {
        const dateStr = new Date(t.completedAt).toDateString();
        dates.add(dateStr);
      }
    });
    
    let streak = 0;
    let currentDate = new Date();
    // Check today first
    if (dates.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // If today is not completed, maybe yesterday was
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (dates.has(yesterday.toDateString())) {
        streak++; // wait, if yesterday has it, we count it
        currentDate = yesterday;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    while (dates.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // fallback for the fake ones if no dates available but some are completed
    if (streak === 0 && tasks.some(t => t.completed)) {
      streak = 1;
    }

    return streak;
  };

  const streak = calculateStreak();

  // Focus Hours & Upcoming Deadlines
  let focusMinutes = 0;
  let upcomingDeadlines = 0;

  tasks.forEach(t => {
    if (!t.completed) {
      upcomingDeadlines++;
    }
    
    const isHighFocus = t.energyRequired === 'high' || t.type === 'high-priority';
    if (isHighFocus) {
      let startMins = t.startHour * 60;
      if (t.startTime) {
        startMins = parseInt(t.startTime.split(':')[0], 10) * 60 + parseInt(t.startTime.split(':')[1] || '0', 10);
      }
      let endMins = t.endHour * 60;
      if (t.endTime) {
        endMins = parseInt(t.endTime.split(':')[0], 10) * 60 + parseInt(t.endTime.split(':')[1] || '0', 10);
      }
      focusMinutes += Math.max(0, endMins - startMins);
    }
  });

  const focusHours = (focusMinutes / 60).toFixed(1);

  // Energy Distribution
  const completedTasks = tasks.filter(t => t.completed);
  let highEnergy = 0;
  let lowEnergy = 0;
  completedTasks.forEach(t => {
    if (t.energyRequired === 'high') highEnergy++;
    else if (t.energyRequired === 'low') lowEnergy++;
    else {
      // If not explicitly set, infer from type
      if (t.type === 'high-priority') highEnergy++;
      else lowEnergy++;
    }
  });

  const totalEnergy = highEnergy + lowEnergy || 1; // prevent div by zero
  const highEnergyPercent = Math.round((highEnergy / totalEnergy) * 100);
  const lowEnergyPercent = totalEnergy === 1 && highEnergy === 0 && lowEnergy === 0 ? 0 : 100 - highEnergyPercent;

  // Hourly Productivity Heatmap
  const blockCounts: Record<string, number> = {};
  const blocks = [
    { start: 8, end: 10, label: "08:00-10:00" },
    { start: 10, end: 12, label: "10:00-12:00" },
    { start: 12, end: 14, label: "12:00-14:00" },
    { start: 14, end: 16, label: "14:00-16:00" },
    { start: 16, end: 18, label: "16:00-18:00" },
    { start: 18, end: 20, label: "18:00-20:00" },
    { start: 20, end: 22, label: "20:00-22:00" },
  ];

  blocks.forEach(b => blockCounts[b.label] = 0);

  completedTasks.forEach(t => {
    // Determine which block this task belongs to
    const block = blocks.find(b => t.startHour >= b.start && t.startHour < b.end);
    // If it's exactly 22 (10 PM), let's put it in the last block just in case
    if (block) {
      blockCounts[block.label]++;
    } else if (t.startHour === 22) {
      blockCounts["20:00-22:00"]++;
    }
  });

  const maxCount = Math.max(...Object.values(blockCounts), 1);

  return (
    <main className="flex-1 flex flex-col p-6 lg:p-10 overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-[#0d1117] transition-colors duration-200 min-h-[50vh] lg:min-h-0">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analytics & Insights</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Track your deep work and productivity trends</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Core Streak Tracker */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm flex items-center gap-6 group hover:border-gray-300 dark:hover:border-gray-700/50 transition-all">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Flame size={32} className="text-orange-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Daily Streak</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light text-slate-900 dark:text-white">{streak}</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Days</span>
            </div>
          </div>
        </div>

        {/* Focus Hours */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm flex items-center gap-6 group hover:border-gray-300 dark:hover:border-gray-700/50 transition-all">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Brain size={32} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Focus Hours</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light text-slate-900 dark:text-white">{focusHours}</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">h</span>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm flex items-center gap-6 group hover:border-gray-300 dark:hover:border-gray-700/50 transition-all">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarDays size={32} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pending Tasks</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light text-slate-900 dark:text-white">{upcomingDeadlines}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Energy Distribution Chart */}
        <div className="p-8 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm flex flex-col justify-center transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap size={20} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Energy Distribution</h3>
          </div>
          
          <div className="flex justify-between text-sm mb-3">
            <div className="font-medium text-red-500">{highEnergyPercent}% High Focus</div>
            <div className="font-medium text-blue-500">{lowEnergyPercent}% Low Energy</div>
          </div>
          
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000" 
              style={{ width: `${highEnergyPercent}%` }}
            ></div>
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000" 
              style={{ width: `${lowEnergyPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Hourly Productivity Heatmap */}
      <div className="flex flex-col p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm flex-1 min-h-[300px] transition-all duration-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <BarChart2 size={20} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Hourly Productivity Heatmap</h3>
        </div>

        <div className="w-full overflow-x-auto overflow-y-hidden pb-4 mt-4 scrollbar-thin">
          <div className="flex items-end gap-6 min-w-max px-2 h-48">
            {Object.entries(blockCounts).map(([label, count]) => {
              const heightPercent = count === 0 ? 0 : Math.max(5, (count / maxCount) * 100);
              return (
                <div key={label} className="flex flex-col items-center gap-2 group">
                  <div className="flex items-end justify-center w-12 sm:w-16 h-32 relative">
                    <div 
                      className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 border border-emerald-500/30 rounded-t-md transition-all duration-500 relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {count > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

