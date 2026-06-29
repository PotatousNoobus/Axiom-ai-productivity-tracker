"use client";
import { useState, useEffect } from "react";
import { Sun, Moon, Settings as SettingsIcon, GraduationCap, Briefcase, Rocket, Eye, EyeOff, Key, Check, Download, Trash2 } from "lucide-react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";

interface SettingsViewProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  userProfile: 'Student' | 'Working Professional' | 'Startup Founder';
  onProfileChange: (profile: 'Student' | 'Working Professional' | 'Startup Founder') => void;
}

export default function SettingsView({ theme, onThemeChange, userProfile, onProfileChange }: SettingsViewProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("USER_GEMINI_API_KEY");
      if (storedKey) {
        setApiKeyInput(storedKey);
      }
    }
  }, []);

  const handleSaveKey = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("USER_GEMINI_API_KEY", apiKeyInput.trim());
      setSavedSuccess(true);
      // Dispatch a custom event to notify other components of the updated key
      window.dispatchEvent(new Event("user_gemini_key_changed"));
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleExportData = async () => {
    try {
      setExporting(true);
      const querySnapshot = await getDocs(collection(db, "tasks"));
      const tasksData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Untitled",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          startHour: data.startHour || 9,
          endHour: data.endHour || 10,
          type: data.type || "focused",
          completed: !!data.completed,
          completedAt: data.completedAt || null,
          energyRequired: data.energyRequired || null,
        };
      });

      const jsonString = JSON.stringify(tasksData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "productivity_data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleResetAllData = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete all tasks, streaks, and settings? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setClearing(true);
      // Fetch and delete all tasks in the database
      const querySnapshot = await getDocs(collection(db, "tasks"));
      const deletePromises = querySnapshot.docs.map(docSnap =>
        deleteDoc(doc(db, "tasks", docSnap.id))
      );
      await Promise.all(deletePromises);

      // Clear localStorage but preserve the custom API key if configured
      if (typeof window !== "undefined") {
        const userApiKey = localStorage.getItem("USER_GEMINI_API_KEY");
        localStorage.clear();
        if (userApiKey) {
          localStorage.setItem("USER_GEMINI_API_KEY", userApiKey);
        }
        
        // Reload to completely reset the application state to a clean template
        window.location.reload();
      }
    } catch (error) {
      console.error("Error resetting application data:", error);
      alert("Failed to reset application data.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 lg:p-10 lg:overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-[#0d1117] transition-colors duration-200">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/10 border border-cyan-500/20 shadow-sm">
            <SettingsIcon size={24} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your application preferences</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="max-w-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800/50 pb-3">
            Appearance
          </h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Theme Selection</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                Switch between light and dark visual presentation modes to customize your environment.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800/50">
              <button
                onClick={() => onThemeChange("light")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  theme === "light"
                    ? "bg-white text-cyan-600 shadow-sm border border-gray-200/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  theme === "dark"
                    ? "bg-[#161b22] text-cyan-400 shadow-sm border border-gray-800/50"
                    : "text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-3">
            User Profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Calibrate your AI Companion's scheduling strategies, vocabulary, and instructions to match your professional background.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onProfileChange('Student')}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                userProfile === 'Student'
                  ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-500 ring-1 ring-cyan-500 text-cyan-950 dark:text-cyan-400'
                  : 'bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 mb-3">
                <GraduationCap size={20} />
              </div>
              <span className="font-semibold text-sm">Student</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                Optimized for classes, exams, study blocks, and quick sprints.
              </span>
            </button>

            <button
              onClick={() => onProfileChange('Working Professional')}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                userProfile === 'Working Professional'
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-1 ring-indigo-500 text-indigo-950 dark:text-indigo-400'
                  : 'bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-3">
                <Briefcase size={20} />
              </div>
              <span className="font-semibold text-sm">Working Professional</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                Designed for WFH, corporate 9-to-5 bounds, and deep-work.
              </span>
            </button>

            <button
              onClick={() => onProfileChange('Startup Founder')}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                userProfile === 'Startup Founder'
                  ? 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-500 ring-1 ring-pink-500 text-pink-950 dark:text-pink-400'
                  : 'bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-slate-700 dark:text-gray-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 mb-3">
                <Rocket size={20} />
              </div>
              <span className="font-semibold text-sm">Startup Founder</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                Calibrated for high volatility, scales, burn-rate, and priority fires.
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-3">
            API Configuration
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Provide your custom Gemini API key. If configured, this application will prioritize using your custom key for all dynamic AI breakdown and productivity coaching operations.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Gemini API Key..."
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                onClick={handleSaveKey}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Save Key</span>
              </button>
            </div>

            {savedSuccess && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-900/30 animate-pulse">
                <Check size={14} />
                <span>API Key saved successfully! Future AI tasks will utilize your key.</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-3">
            Data & Privacy
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Export your tasks and preferences, or completely purge your device and cloud records to start with a fresh configuration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-t border-gray-50 dark:border-gray-800/20 pt-4">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-800 dark:text-gray-200">Export Application State</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Download a fully formatted JSON snapshot of your current tasks.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-800 dark:text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download size={16} />
              <span>{exporting ? "Exporting..." : "Download My Data"}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-t border-gray-100 dark:border-gray-800/30 pt-6 mt-6">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>Danger Zone</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Wipe all historical metrics, tasks, and system preferences. This action is permanent.
              </p>
            </div>
            <button
              onClick={handleResetAllData}
              disabled={clearing}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span>{clearing ? "Resetting..." : "Reset All Application Data"}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
