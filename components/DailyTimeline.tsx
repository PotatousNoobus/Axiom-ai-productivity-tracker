"use client";
import { useState, useEffect, useRef } from "react";
import { Check, Clock, Plus, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "@/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

export type Task = {
  id: string;
  title: string;
  startHour: number; // 24-hour format
  endHour: number;
  startTime?: string;
  endTime?: string;
  type: "high-priority" | "focused" | "downtime";
  completed: boolean;
  completedAt?: string | null;
  energyRequired?: "high" | "low" | null;
  isOverdue?: boolean;
  isNotesExpanded?: boolean;
  userNotes?: string;
  date?: string;
};

const PROFILE_HOURS = {
  'Student': { start: 8, end: 24.5 },
  'Working Professional': { start: 9, end: 18 },
  'Startup Founder': { start: 7, end: 25.5 }
};

const RESET_HOURS: Record<string, number> = {
  'Student': 8,
  'Working Professional': 4,
  'Startup Founder': 5
};

const getCurrentLogicalDate = (profile: string) => {
  const resetHour = RESET_HOURS[profile] ?? 4;
  const now = new Date();
  if (now.getHours() < resetHour) {
    now.setDate(now.getDate() - 1);
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DailyTimeline({ 
  userProfile = 'Student', 
  activeDate: externalActiveDate, 
  setActiveDate: externalSetActiveDate 
}: { 
  userProfile?: 'Student' | 'Working Professional' | 'Startup Founder',
  activeDate?: string,
  setActiveDate?: (date: string | ((prev: string) => string)) => void
}) {
  const [localActiveDate, setLocalActiveDate] = useState<string>(() => getCurrentLogicalDate(userProfile));
  
  const activeDate = externalActiveDate !== undefined ? externalActiveDate : localActiveDate;
  const setActiveDate = externalSetActiveDate !== undefined ? externalSetActiveDate : setLocalActiveDate;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (externalActiveDate === undefined) {
      setLocalActiveDate(getCurrentLogicalDate(userProfile));
    }
  }, [userProfile, externalActiveDate]);

  const [tasks, setTasks] = useState<Record<string, Task[]>>(() => {
    if (typeof window !== 'undefined') {
       try {
         const stored = localStorage.getItem('daily_tasks');
         if (stored) return JSON.parse(stored);
       } catch(e) {}
    }
    return {};
  });

  const chime = useRef<HTMLAudioElement | null>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', startTime: '', endTime: '' });

  const navigateDate = (days: number) => {
    setActiveDate(prev => {
      const [year, month, day] = prev.split('-').map(Number);
      const newDate = new Date(year, month - 1, day + days);
      const newYear = newDate.getFullYear();
      const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(newDate.getDate()).padStart(2, '0');
      return `${newYear}-${newMonth}-${newDay}`;
    });
  };

  const todayStr = getCurrentLogicalDate(userProfile);

  const goToToday = () => {
    setActiveDate(todayStr);
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      chime.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

      const handleUnlockAudio = () => {
        if (chime.current) {
          chime.current.volume = 0;
          chime.current.play().then(() => {
            if (chime.current) {
              chime.current.pause();
              chime.current.currentTime = 0;
              chime.current.volume = 1;
            }
          }).catch(() => {});
          window.removeEventListener('pointerdown', handleUnlockAudio);
        }
      };
      window.addEventListener('pointerdown', handleUnlockAudio);
      return () => window.removeEventListener('pointerdown', handleUnlockAudio);
    }
  }, []);

  // Background task engine (Overdue rescheduling)
  useEffect(() => {
    const interval = setInterval(async () => {
      const todayDateStr = getCurrentLogicalDate(userProfile);
      
      const activeTasks = tasks[todayDateStr] || [];
      if (activeTasks.length === 0) return;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeFloat = currentHour + currentMinute / 60;
      const boundaryEnd = PROFILE_HOURS[userProfile].end;
      
      // Overdue Grace Period (5-Minute Delay)
      for (const task of activeTasks) {
        if (task.completed || task.isOverdue) continue;
        
        let taskEndFloat = task.endHour;
        if (task.endTime) {
          const parts = task.endTime.split(':');
          taskEndFloat = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
        }
        
        // 5-minute buffer: 5 / 60 = 0.08333...
        const isMissed = currentTimeFloat >= (taskEndFloat + (5 / 60));
        
        if (isMissed) {
          let taskStartFloat = task.startHour;
          if (task.startTime) {
            const parts = task.startTime.split(':');
            taskStartFloat = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
          }
          const durationFloat = taskEndFloat - taskStartFloat;
          
          // Gap Search
          const futureTasks = activeTasks.filter(t => {
            if (t.id === task.id || t.completed || t.isOverdue) return false;
            let tStart = t.startHour;
            if (t.startTime) {
              const p = t.startTime.split(':');
              tStart = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
            }
            return tStart >= currentTimeFloat;
          }).sort((a, b) => {
            let aStart = a.startHour, bStart = b.startHour;
            if (a.startTime) {
               const p = a.startTime.split(':');
               aStart = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
            }
            if (b.startTime) {
               const p = b.startTime.split(':');
               bStart = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
            }
            return aStart - bStart;
          });
          
          let proposedStartFloat = currentTimeFloat;
          let scheduled = false;
          
          for (const ft of futureTasks) {
            let ftStart = ft.startHour;
            if (ft.startTime) {
               const p = ft.startTime.split(':');
               ftStart = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
            }
            
            if (proposedStartFloat + durationFloat <= ftStart) {
               scheduled = true;
               break;
            } else {
               let ftEnd = ft.endHour;
               if (ft.endTime) {
                 const p = ft.endTime.split(':');
                 ftEnd = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
               }
               proposedStartFloat = Math.max(proposedStartFloat, ftEnd);
            }
          }
          
          const proposedEndFloat = proposedStartFloat + durationFloat;
          
          if (proposedEndFloat <= boundaryEnd) {
            const newStartHour = Math.floor(proposedStartFloat);
            const newStartMin = Math.round((proposedStartFloat - newStartHour) * 60);
            const newEndHour = Math.floor(proposedEndFloat);
            const newEndMin = Math.round((proposedEndFloat - newEndHour) * 60);
            
            const startString = `${newStartHour.toString().padStart(2, '0')}:${newStartMin.toString().padStart(2, '0')}`;
            const endString = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
            
            try {
              await updateDoc(doc(db, "tasks", task.id), {
                startTime: startString,
                endTime: endString,
                startHour: newStartHour,
                endHour: newEndHour
              });
            } catch(e) { console.error("Error rescheduling", e); }
          } else {
            try {
              await updateDoc(doc(db, "tasks", task.id), {
                isOverdue: true
              });
            } catch(e) { console.error("Error setting overdue", e); }
          }
        }
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [tasks, userProfile]);

  // Background notification engine (Start notifications using exact timeouts)
  useEffect(() => {
    const todayDateStr = getCurrentLogicalDate(userProfile);
    const activeTasks = tasks[todayDateStr] || [];
    
    if (activeTasks.length === 0) return;
    
    const timeouts: NodeJS.Timeout[] = [];
    const now = new Date();
    
    activeTasks.forEach(task => {
      if (task.completed || task.isOverdue) return;
      
      const timeStr = task.startTime;
      if (!timeStr) return;
      
      const parts = timeStr.split(':');
      if (parts.length !== 2) return;
      
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      
      // Calculate exact Date object for task.startTime
      const taskTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
      
      const delay = taskTime.getTime() - Date.now();
      
      // Ensure we don't spam notifications for past tasks
      // and only schedule if within the next 24 hours
      if (delay > 0 && delay < 86400000 && !notifiedTasks.current.has(task.id)) {
        const timeoutId = setTimeout(() => {
          notifiedTasks.current.add(task.id);
          
          // Visual notification unconditionally
          toast(`Task Starting: ${task.title}`, {
            icon: '🚨',
            duration: 8000,
            position: 'top-center',
            style: { border: '2px solid #3b82f6', padding: '16px', fontWeight: 'bold', fontSize: '1.1rem' }
          });
          
          const profileStart = PROFILE_HOURS[userProfile].start;
          const profileEnd = PROFILE_HOURS[userProfile].end;
          
          const currentHour = new Date().getHours();
          if (currentHour >= profileStart && currentHour < profileEnd) {
            // Day mode: play audio chime if not in silent mode
            const isSilentMode = localStorage.getItem('isSilentMode') === 'true';
            if (!isSilentMode && chime.current) {
              chime.current.play().catch((e) => {
                if (e.name === 'NotAllowedError') {
                  toast.error('Audio blocked by browser. Click anywhere to enable.');
                }
                console.error("Audio playback failed", e);
              });
            }
          }
        }, delay);
        timeouts.push(timeoutId);
      }
    });
    
    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [tasks, userProfile]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let startHour = data.startHour;
        let endHour = data.endHour;

        if (data.startTime) {
          startHour = parseInt(data.startTime.split(':')[0], 10);
        }
        if (data.endTime) {
          endHour = parseInt(data.endTime.split(':')[0], 10);
        }

        return {
          id: docSnap.id,
          title: data.title || "Untitled",
          startTime: data.startTime,
          endTime: data.endTime,
          startHour: startHour || 9,
          endHour: endHour || 10,
          type: data.type || "focused",
          completed: !!data.completed,
          completedAt: data.completedAt,
          energyRequired: data.energyRequired,
          isOverdue: !!data.isOverdue,
          isNotesExpanded: !!data.isNotesExpanded,
          userNotes: data.userNotes || "",
          date: data.date
        };
      });
      
      const newTasksRecord: Record<string, Task[]> = {};
      
      const currentLogicalDate = getCurrentLogicalDate(userProfile);

      fetchedTasks.forEach(task => {
         const dateKey = task.date || currentLogicalDate;
         
         // Garbage Collection: Delete incomplete tasks from past logical days
         if (dateKey < currentLogicalDate && !task.completed) {
           deleteDoc(doc(db, "tasks", task.id)).catch(console.error);
           return;
         }

         if (!newTasksRecord[dateKey]) newTasksRecord[dateKey] = [];
         newTasksRecord[dateKey].push(task);
      });

      for (const d in newTasksRecord) {
        newTasksRecord[d].sort((a, b) => {
          const aStart = a.startHour + (a.startTime ? parseInt(a.startTime.split(':')[1] || '0') / 60 : 0);
          const bStart = b.startHour + (b.startTime ? parseInt(b.startTime.split(':')[1] || '0') / 60 : 0);
          return aStart - bStart;
        });
      }

      setTasks(newTasksRecord);
      localStorage.setItem('daily_tasks', JSON.stringify(newTasksRecord));
    });

    return () => unsubscribe();
  }, [userProfile]);



  useEffect(() => {
    const handleAIAction = async (event: Event) => {
      const customEvent = event as CustomEvent<{ addedTasks?: any[], updatedTasks?: any[], deletedTaskIds?: any[] }>;
      const { addedTasks = [], updatedTasks = [], deletedTaskIds = [] } = customEvent.detail;
      
      const normalizedDeletedIds = deletedTaskIds.map((id: any) => typeof id === 'string' ? id : id.id);

      setTasks(prev => {
        let nextTasks = { ...prev };
        
        for (const date in nextTasks) {
          nextTasks[date] = nextTasks[date].filter(t => !normalizedDeletedIds.includes(t.id));
        }

        for (const date in nextTasks) {
          nextTasks[date] = nextTasks[date].map(t => {
            const updated = updatedTasks.find(ut => ut.id === t.id);
            if (updated) {
              const startHour = updated.startTime ? parseInt(updated.startTime.split(':')[0], 10) : t.startHour;
              const endHour = updated.endTime ? parseInt(updated.endTime.split(':')[0], 10) : t.endHour;
              return { ...t, ...updated, startHour, endHour };
            }
            return t;
          });
        }

        const newLocalTasks = addedTasks.map(t => {
          const type = t.type || (t.requiresBlock === "deep-work" || t.energyRequired === "high" ? "high-priority" : "focused");
          let startHour = 9;
          if (t.startTime) {
            startHour = parseInt(t.startTime.split(':')[0], 10);
          }
          let endHour = startHour + 1;
          if (t.endTime) {
             endHour = parseInt(t.endTime.split(':')[0], 10);
          }
          return {
            id: 'temp-' + Date.now() + Math.random(),
            title: t.title,
            startTime: t.startTime,
            endTime: t.endTime,
            startHour,
            endHour,
            type,
            completed: false,
            energyRequired: t.energyRequired || null,
            requiresBlock: t.requiresBlock || null,
            date: t.targetDate || t.date || activeDate
          } as Task;
        });

        for (const t of newLocalTasks) {
          const d = t.date || activeDate;
          if (!nextTasks[d]) nextTasks[d] = [];
          nextTasks[d].push(t);
        }

        for (const d in nextTasks) {
          nextTasks[d].sort((a, b) => {
            const aStart = a.startHour + (a.startTime ? parseInt(a.startTime.split(':')[1] || '0') / 60 : 0);
            const bStart = b.startHour + (b.startTime ? parseInt(b.startTime.split(':')[1] || '0') / 60 : 0);
            return aStart - bStart;
          });
        }

        localStorage.setItem('daily_tasks', JSON.stringify(nextTasks));
        return nextTasks;
      });

      // Background sync to Firestore
      for (const id of normalizedDeletedIds) {
        deleteDoc(doc(db, "tasks", id)).catch(console.error);
      }

      for (const t of updatedTasks) {
        if (t.id) {
          const taskRef = doc(db, "tasks", t.id);
          const updateData: any = { ...t };
          delete updateData.id;
          
          if (t.startTime) {
            updateData.startHour = parseInt(t.startTime.split(':')[0], 10);
          }
          if (t.endTime) {
            updateData.endHour = parseInt(t.endTime.split(':')[0], 10);
          }
          
          updateDoc(taskRef, updateData).catch(console.error);
        }
      }

      for (const t of addedTasks) {
        const type = t.type || (t.requiresBlock === "deep-work" || t.energyRequired === "high" ? "high-priority" : "focused");
        let startHour = 9;
        if (t.startTime) {
          startHour = parseInt(t.startTime.split(':')[0], 10);
        }
        let endHour = startHour + 1;
        if (t.endTime) {
            endHour = parseInt(t.endTime.split(':')[0], 10);
        }

        addDoc(collection(db, "tasks"), {
          title: t.title,
          startTime: t.startTime,
          endTime: t.endTime,
          startHour,
          endHour,
          type,
          completed: false,
          energyRequired: t.energyRequired || null,
          requiresBlock: t.requiresBlock || null,
          date: t.targetDate || t.date || activeDate
        }).catch(console.error);
      }
    };
    
    window.addEventListener('ai_action', handleAIAction);
    return () => window.removeEventListener('ai_action', handleAIAction);
  }, [activeDate]);

  const toggleTask = async (id: string) => {
    const list = tasks[activeDate] || [];
    const task = list.find(t => t.id === id);
    if (!task) return;
    
    const newCompletedState = !task.completed;
    
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      completed: newCompletedState,
      completedAt: newCompletedState ? new Date().toISOString() : null
    });

    if (newCompletedState) {
      try {
        const historyStr = localStorage.getItem('historicalContext');
        let history = historyStr ? JSON.parse(historyStr) : [];
        if (!Array.isArray(history)) history = [];
        
        const dateStr = new Date().toLocaleDateString();
        history.push(`Completed '${task.title}' on ${dateStr}`);
        
        if (history.length > 10) {
          history = history.slice(history.length - 10);
        }
        
        localStorage.setItem('historicalContext', JSON.stringify(history));
        
        toast.success('Task completed & saved to AI memory!');
      } catch (e) {
        console.error('Failed to save to history', e);
      }
    } else {
      try {
        const historyStr = localStorage.getItem('historicalContext');
        let history = historyStr ? JSON.parse(historyStr) : [];
        if (!Array.isArray(history)) history = [];
        
        const filteredHistory = history.filter((item: string) => !item.startsWith(`Completed '${task.title}' on `));
        localStorage.setItem('historicalContext', JSON.stringify(filteredHistory));
      } catch (e) {
        console.error('Failed to remove from history', e);
      }
    }
  };

  const toggleNotes = async (id: string) => {
    const list = tasks[activeDate] || [];
    const task = list.find(t => t.id === id);
    if (!task) return;
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      isNotesExpanded: !task.isNotesExpanded
    });
  };

  const handleNotesChange = async (id: string, newNotes: string) => {
    const list = tasks[activeDate] || [];
    const task = list.find(t => t.id === id);
    if (!task) return;
    
    // Optimistically update local state so typing is smooth
    setTasks(prev => {
      const nextTasks = { ...prev };
      if (nextTasks[activeDate]) {
        nextTasks[activeDate] = nextTasks[activeDate].map(t => t.id === id ? { ...t, userNotes: newNotes } : t);
      }
      return nextTasks;
    });
    
    // Note: We don't need to await here, we just fire and forget to DB.
    // Also, firing updateDoc on every keystroke might be too much, but Firestore SDK batches them.
    // We should probably rely on onBlur or debouncing, but for now onChange or onBlur will call this.
    // Let's use it mainly for onBlur to avoid spamming writes.
  };

  const saveNotesToDB = async (id: string, notes: string) => {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      userNotes: notes
    });
  };

  const saveNewTask = () => {
    if (!newTaskData.title || !newTaskData.startTime || !newTaskData.endTime) return;

    const startHour = parseInt(newTaskData.startTime.split(':')[0], 10);
    const endHour = parseInt(newTaskData.endTime.split(':')[0], 10);

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskData.title,
      type: 'focused',
      startTime: newTaskData.startTime,
      endTime: newTaskData.endTime,
      startHour,
      endHour,
      completed: false,
      userNotes: "",
      isNotesExpanded: false,
      date: activeDate
    };

    setTasks(prev => {
      const nextTasks = { ...prev };
      const list = nextTasks[activeDate] ? [...nextTasks[activeDate]] : [];
      list.push(newTask);
      list.sort((a, b) => {
        const aStart = a.startHour + (a.startTime ? parseInt(a.startTime.split(':')[1] || '0') / 60 : 0);
        const bStart = b.startHour + (b.startTime ? parseInt(b.startTime.split(':')[1] || '0') / 60 : 0);
        return aStart - bStart;
      });
      nextTasks[activeDate] = list;
      localStorage.setItem('daily_tasks', JSON.stringify(nextTasks));
      return nextTasks;
    });

    addDoc(collection(db, "tasks"), {
      title: newTask.title,
      startTime: newTask.startTime,
      endTime: newTask.endTime,
      startHour: newTask.startHour,
      endHour: newTask.endHour,
      type: newTask.type,
      completed: newTask.completed,
      energyRequired: null,
      requiresBlock: null,
      date: activeDate
    }).catch(console.error);

    setIsAddingTask(false);
    setNewTaskData({ title: '', startTime: '', endTime: '' });
  };

  const formatTime = (timeStr?: string, fallbackHour?: number) => {
    if (timeStr) {
      const parts = timeStr.split(':');
      let hour = parseInt(parts[0], 10);
      if (hour === 24) hour = 0;
      const min = parts[1] || '00';
      const formattedHour = hour.toString().padStart(2, '0');
      return `${formattedHour}:${min}`;
    }
    if (fallbackHour !== undefined) {
      let hour = fallbackHour;
      if (hour === 24) hour = 0;
      const formattedHour = hour.toString().padStart(2, '0');
      return `${formattedHour}:00`;
    }
    return '';
  };

  const getTaskStyles = (type: Task["type"], completed: boolean, isOverdue?: boolean) => {
    if (completed) {
      return "bg-gray-100/50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700/30 text-gray-400 dark:text-gray-500 opacity-50";
    }
    if (isOverdue) {
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600/50 text-amber-900 dark:text-amber-100 border-l-4 border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)] dark:shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:bg-amber-100/50 dark:hover:bg-amber-900/40 hover:-translate-y-0.5 cursor-pointer";
    }
    switch (type) {
      case "high-priority":
        return "bg-red-50/70 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100 border-l-4 border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.05)] dark:shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:bg-red-100/50 dark:hover:bg-red-500/20 hover:-translate-y-0.5 cursor-pointer";
      case "focused":
        return "bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100 border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)] dark:shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:bg-blue-100/50 dark:hover:bg-blue-500/20 hover:-translate-y-0.5 cursor-pointer";
      case "downtime":
        return "bg-gray-100/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 text-slate-700 dark:text-gray-300 border-l-4 border-l-gray-400 dark:border-l-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 cursor-pointer";
    }
  };

  if (!isMounted) {
    return (
      <div className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#161b22] flex flex-col relative min-h-[500px]">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800/50 flex flex-col gap-4 bg-white dark:bg-[#161b22] z-30 sticky top-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="truncate">Daily Timeline</span>
              </h2>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4">
          <div className="w-full h-24 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
          <div className="w-full h-24 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
          <div className="w-full h-24 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#161b22] flex flex-col relative min-h-[500px]">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800/50 flex flex-col gap-4 bg-white dark:bg-[#161b22] z-30 sticky top-0 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">Daily Timeline</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateDate(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 cursor-pointer transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300 min-w-[100px] text-center">
              {formatDisplayDate(activeDate)}
            </span>
            <button onClick={() => navigateDate(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 cursor-pointer transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          {activeDate !== todayStr && (
            <button onClick={goToToday} className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors cursor-pointer">
              Go to Today
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 pr-6 pl-2 sm:p-6 scrollbar-thin">
        <div className="flex flex-col gap-6">
          <AnimatePresence>
            {(!tasks[activeDate] || tasks[activeDate].length === 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">No tasks for this day</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add a task using the AI companion to get started.</p>
              </motion.div>
            )}
            {[...(tasks[activeDate] || [])]
              .sort((a, b) => {
                if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1;
                }
                const aTime = a.startTime || `${a.startHour.toString().padStart(2, '0')}:00`;
                const bTime = b.startTime || `${b.startHour.toString().padStart(2, '0')}:00`;
                return aTime.localeCompare(bTime);
              })
              .map((task) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: task.completed ? 0.6 : 1, 
                  y: 0,
                  scale: task.completed ? 0.98 : 1
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                key={task.id} 
                className="flex flex-col md:flex-row md:gap-4 relative"
              >
                <div className="w-full md:w-32 shrink-0 text-left md:text-right md:pr-6 pt-2 relative mb-2 md:mb-0">
                   <div className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                      {formatTime(task.startTime, task.startHour)}
                   </div>
                   <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTime(task.endTime, task.endHour)}
                   </div>
                </div>
                <div className="flex-1 relative pb-2">
                   {/* Timeline Node and Line */}
                   <div className={`absolute left-[-21px] top-4 w-3 h-3 rounded-full ring-4 ring-white dark:ring-[#161b22] z-10 transition-colors ${task.completed ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                   <div className="absolute left-[-16px] top-7 bottom-[-80px] md:bottom-[-24px] w-0.5 bg-gray-200 dark:bg-gray-800/50"></div>
                   
                   <motion.div
                     layout
                     className={`h-auto py-3 px-4 rounded-xl border transition-colors duration-300 flex flex-col justify-between group ${getTaskStyles(task.type, task.completed, task.isOverdue)}`}
                   >
                     <motion.div layout className="flex justify-between items-start gap-4">
                       <motion.div layout>
                         <h3 className={`font-semibold text-sm leading-relaxed transition-colors ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-slate-800 dark:text-gray-100'}`}>
                           {task.title}
                         </h3>
                       </motion.div>
                       <div className="flex items-start gap-2 shrink-0">
                         <motion.button
                           layout
                           onClick={(e) => {
                             e.stopPropagation();
                             setTasks(prev => {
                               const nextTasks = { ...prev };
                               if (nextTasks[activeDate]) {
                                 nextTasks[activeDate] = nextTasks[activeDate].filter(t => t.id !== task.id);
                               }
                               localStorage.setItem('daily_tasks', JSON.stringify(nextTasks));
                               return nextTasks;
                             });
                             deleteDoc(doc(db, "tasks", task.id)).catch(console.error);
                           }}
                           className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-500 hover:text-red-500 cursor-pointer p-1 -mt-1"
                         >
                           <Trash2 size={16} />
                         </motion.button>
                         <div className="flex flex-col items-center gap-2">
                           <motion.button
                             layout
                             onClick={() => toggleTask(task.id)}
                             className={`w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${task.completed ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500 dark:text-cyan-400' : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 hover:bg-cyan-500/10'}`}
                           >
                             {task.completed && <Check size={14} />}
                           </motion.button>
                           <motion.button
                             layout
                             onClick={() => toggleNotes(task.id)}
                             className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
                           >
                             {task.isNotesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                           </motion.button>
                         </div>
                       </div>
                     </motion.div>
                     
                     <AnimatePresence mode="popLayout">
                       {!task.completed && (
                         <motion.div 
                           key={`type-${task.id}`}
                           layout
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           transition={{ duration: 0.2 }}
                           className="text-[10px] uppercase tracking-wider font-semibold opacity-70 mt-3 origin-top"
                         >
                           {task.type.replace('-', ' ')}
                         </motion.div>
                       )}
                       {task.isNotesExpanded && (
                         <motion.div
                           key={`notes-${task.id}`}
                           layout
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           transition={{ duration: 0.3, ease: "easeInOut" }}
                           className="mt-3 overflow-hidden origin-top"
                         >
                           <textarea
                             value={task.userNotes || ""}
                             onChange={(e) => handleNotesChange(task.id, e.target.value)}
                             onBlur={(e) => saveNotesToDB(task.id, e.target.value)}
                             placeholder="Add additional notes..."
                             className="w-full bg-black/5 dark:bg-slate-900/50 resize-none p-3 rounded-lg text-sm text-slate-700 dark:text-gray-300 border border-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                             rows={3}
                           />
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isAddingTask ? (
            <div className="w-full flex flex-col gap-3 py-4 px-4 mt-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTaskData.title}
                onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white dark:bg-[#161b22] px-3 py-2 rounded-lg text-sm text-slate-900 dark:text-gray-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTaskData.startTime}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="flex-1 bg-white dark:bg-[#161b22] px-3 py-2 rounded-lg text-sm text-slate-900 dark:text-gray-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
                <input
                  type="time"
                  value={newTaskData.endTime}
                  onChange={(e) => setNewTaskData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="flex-1 bg-white dark:bg-[#161b22] px-3 py-2 rounded-lg text-sm text-slate-900 dark:text-gray-100 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskData({ title: '', startTime: '', endTime: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTask(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Add Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
