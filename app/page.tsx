"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import ChatPanel from "@/components/ChatPanel";
import OnboardingModal from "@/components/OnboardingModal";
import AnalyticsView from "@/components/AnalyticsView";
import SettingsView from "@/components/SettingsView";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [userProfile, setUserProfile] = useState<'Student' | 'Working Professional' | 'Startup Founder'>('Student');
  const [activeDate, setActiveDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; // Temporary, will be overridden by useEffect if profile has different reset hour
  });

  useEffect(() => {
    // We can define getCurrentLogicalDate here or just handle it.
    const RESET_HOURS: Record<string, number> = {
      'Student': 8,
      'Working Professional': 4,
      'Startup Founder': 5
    };
    const resetHour = RESET_HOURS[userProfile] ?? 4;
    const now = new Date();
    if (now.getHours() < resetHour) {
      now.setDate(now.getDate() - 1);
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setActiveDate(`${year}-${month}-${day}`);
  }, [userProfile]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }

    const savedProfile = localStorage.getItem("userProfile") as 'Student' | 'Working Professional' | 'Startup Founder' | null;
    if (savedProfile) {
      setUserProfile(savedProfile);
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  const handleProfileChange = (newProfile: 'Student' | 'Working Professional' | 'Startup Founder') => {
    setUserProfile(newProfile);
    localStorage.setItem("userProfile", newProfile);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-slate-800 dark:bg-[#0d1117] dark:text-gray-200 selection:bg-cyan-500/30 transition-colors duration-200">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile} onProfileChange={handleProfileChange} />
      
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden overflow-x-hidden relative pl-16 lg:pl-0">
        {activeTab === "timeline" && <MainContent userProfile={userProfile} activeDate={activeDate} setActiveDate={setActiveDate} />}
        {activeTab === "analytics" && <AnalyticsView />}
        {activeTab === "settings" && (
          <SettingsView 
            theme={theme} 
            onThemeChange={toggleTheme} 
            userProfile={userProfile} 
            onProfileChange={handleProfileChange} 
          />
        )}
        
        {activeTab === "timeline" && <ChatPanel userProfile={userProfile} activeDate={activeDate} />}
      </div>
      <OnboardingModal />
    </div>
  );
}
