import { CheckCircle2 } from "lucide-react";
import DailyTimeline from "./DailyTimeline";
import VibeScore from "./VibeScore";
import { useChat } from "./ChatContext";

export default function MainContent({ userProfile = 'Student', activeDate, setActiveDate }: { userProfile?: 'Student' | 'Working Professional' | 'Startup Founder', activeDate?: string, setActiveDate?: (date: string | ((prev: string) => string)) => void }) {
  const { tasks: globalTasks, activeDate: globalActiveDate } = useChat();

  // Use props if available (from page.tsx), otherwise fallback to context
  const currentActiveDate = activeDate || globalActiveDate;
  
  const completedToday = (globalTasks[currentActiveDate] || []).filter(task => task.completed).length;
  const totalToday = (globalTasks[currentActiveDate] || []).length;

  return (
    <main className="flex-1 flex flex-col p-6 lg:p-10 lg:overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-[#0d1117] transition-colors duration-200">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Axiom</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your AI-powered focus environment.</p>
        </div>
      </header>

      <VibeScore activeDate={currentActiveDate} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Tasks Accomplished Today", value: `${completedToday}/${totalToday}`, icon: CheckCircle2, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 dark:bg-cyan-500/10" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700/50 cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="text-3xl font-light text-slate-900 dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <DailyTimeline userProfile={userProfile} activeDate={activeDate} setActiveDate={setActiveDate} />
    </main>
  );
}
