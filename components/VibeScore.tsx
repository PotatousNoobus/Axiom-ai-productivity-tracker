"use client";
import { BatteryWarning, BatteryCharging, Zap } from "lucide-react";
import { useChat } from "./ChatContext";

export default function VibeScore({ activeDate }: { activeDate?: string }) {
  const { tasks: globalTasks, activeDate: globalActiveDate } = useChat();
  
  const currentActiveDate = activeDate || globalActiveDate;
  const tasks = globalTasks[currentActiveDate] || [];

  // calculate score based on completed tasks
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => {
      const aTime = a.startTime || `${a.startHour.toString().padStart(2, '0')}:00`;
      const bTime = b.startTime || `${b.startHour.toString().padStart(2, '0')}:00`;
      return aTime.localeCompare(bTime);
  });

  let currentScore = 100;
  let continuousHighEnergyMinutes = 0;
  let lastEndTimeInMinutes = -1;

  const overduePenalty = tasks.filter(t => t.isOverdue && !t.completed).length * 5;

  completedTasks.forEach(task => {
      const getMinutes = (timeStr?: string, fallbackHour?: number) => {
          if (timeStr) {
              const parts = timeStr.split(':');
              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
          return (fallbackHour || 9) * 60;
      };

      const startMins = getMinutes(task.startTime, task.startHour);
      const endMins = getMinutes(task.endTime, task.endHour);
      const duration = Math.max(0, endMins - startMins);

      // Check for explicit gap
      if (lastEndTimeInMinutes !== -1 && startMins > lastEndTimeInMinutes) {
          currentScore += 10;
          continuousHighEnergyMinutes = 0;
          currentScore = Math.min(100, currentScore);
      }

      const isHighEnergy = task.energyRequired === 'high' || task.type === 'high-priority';
      const isLowEnergy = task.energyRequired === 'low' || task.type === 'downtime';

      if (isLowEnergy) {
          currentScore += 10;
          continuousHighEnergyMinutes = 0;
          currentScore = Math.min(100, currentScore);
      } else if (isHighEnergy) {
          continuousHighEnergyMinutes += duration;
          while (continuousHighEnergyMinutes >= 60) {
              currentScore -= 15;
              continuousHighEnergyMinutes -= 60;
          }
      } else {
          // normal focused task, reset the streak or let it be?
          // Let's assume it doesn't add to high energy streak, but doesn't restore points either.
          // We'll reset continuousHighEnergyMinutes to 0 since it's not a continuous high-energy streak anymore.
          continuousHighEnergyMinutes = 0;
      }

      lastEndTimeInMinutes = endMins;
  });

  currentScore -= overduePenalty;

  // Cap score between 0 and 100
  const score = Math.max(0, Math.min(100, currentScore));

  const isWarning = score < 40;
  const isOptimal = score >= 70;

  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100;

  return (
    <div className={`p-6 rounded-2xl border flex items-center gap-6 shadow-sm transition-all mb-8 ${isWarning ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700/50'}`}>
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle className="text-gray-200 dark:text-gray-800 stroke-current" strokeWidth="8" cx="50" cy="50" r="45" fill="transparent" />
                <circle 
                    className={`stroke-current transition-all duration-1000 ease-out ${isWarning ? 'text-orange-500' : isOptimal ? 'text-emerald-500' : 'text-blue-500'}`} 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    cx="50" cy="50" r="45" fill="transparent" 
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${isWarning ? 'text-orange-400' : 'text-slate-900 dark:text-white'}`}>{score}%</span>
            </div>
        </div>
        <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                {isWarning ? <BatteryWarning size={20} className="text-orange-500" /> : <BatteryCharging size={20} className={isOptimal ? 'text-emerald-500' : 'text-blue-500'} />}
                Vibe Score
            </h2>
            {isWarning ? (
                <p className="text-orange-400/90 text-sm font-medium">
                    Vibe check: Battery low. Consider dropping in a low-energy block next to prevent burnout.
                </p>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {isOptimal ? 'Optimal energy levels. Great momentum!' : 'Stable energy. Keep pacing yourself.'}
                </p>
            )}
        </div>
    </div>
  );
}
