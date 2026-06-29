"use client";

import { useState, useEffect } from "react";
import { BookOpen, Briefcase, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Profile = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
};

const profiles: Profile[] = [
  {
    id: "student",
    title: "Student",
    description: "Handles highly variable, fragmented daily timetables and academic deadlines.",
    icon: BookOpen,
    color: "text-cyan-600 dark:text-cyan-400"
  },
  {
    id: "professional",
    title: "Working Professional",
    description: "Optimized for predictable, strict 9-to-5 or work-from-home blocks.",
    icon: Briefcase,
    color: "text-indigo-600 dark:text-indigo-400"
  },
  {
    id: "founder",
    title: "Startup Founder",
    description: "Designed for intense, highly volatile schedules with unpredictable fires.",
    icon: Rocket,
    color: "text-purple-600 dark:text-purple-400"
  }
];

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedProfile = localStorage.getItem("operationalProfile");
    if (!savedProfile) {
      setIsOpen(true);
    }
  }, []);

  const handleSelect = (profileId: string) => {
    localStorage.setItem("operationalProfile", profileId);
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Select Your Operational Profile</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Customize your workspace experience to match your unique daily rhythm.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelect(profile.id)}
                  className="flex flex-col items-center p-8 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800/50 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:border-gray-300 dark:hover:border-gray-750 cursor-pointer group text-left"
                >
                  <div className={`w-16 h-16 rounded-full bg-white dark:bg-gray-800/50 flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-700/50 group-hover:scale-110 transition-transform ${profile.color}`}>
                    <profile.icon size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 w-full text-center group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                    {profile.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed text-center group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                    {profile.description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
