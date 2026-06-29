"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

export type Message = { 
  role: 'user' | 'assistant', 
  text?: string,
  data?: any 
};

// We redefine Task here or import it if possible. For simplicity, we can define it here.
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
  targetDate?: string;
  requiresBlock?: boolean;
};

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  hasPendingOverdueAlert: boolean;
  setHasPendingOverdueAlert: React.Dispatch<React.SetStateAction<boolean>>;
  pendingOverdueTaskTitle: string;
  setPendingOverdueTaskTitle: React.Dispatch<React.SetStateAction<string>>;
  pendingOverdueTaskId: string;
  setPendingOverdueTaskId: React.Dispatch<React.SetStateAction<string>>;
  contextOverride: string;
  setContextOverride: React.Dispatch<React.SetStateAction<string>>;
  alertedTasks: React.MutableRefObject<Set<string>>;
  tasks: Record<string, Task[]>;
  setTasks: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>;
  activeDate: string;
  setActiveDate: React.Dispatch<React.SetStateAction<string>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [hasPendingOverdueAlert, setHasPendingOverdueAlert] = useState(false);
  const [pendingOverdueTaskTitle, setPendingOverdueTaskTitle] = useState("");
  const [pendingOverdueTaskId, setPendingOverdueTaskId] = useState("");
  const [contextOverride, setContextOverride] = useState("");
  const alertedTasks = useRef<Set<string>>(new Set());

  const [activeDate, setActiveDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [tasks, setTasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let startHour = data.startHour;
        let endHour = data.endHour;

        if (data.startTime) startHour = parseInt(data.startTime.split(':')[0], 10);
        if (data.endTime) endHour = parseInt(data.endTime.split(':')[0], 10);

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
          date: data.date,
          targetDate: data.targetDate,
          requiresBlock: data.requiresBlock
        } as Task;
      });
      
      const newTasksRecord: Record<string, Task[]> = {};
      fetchedTasks.forEach(task => {
         const dateKey = task.date || activeDate;
         if (!newTasksRecord[dateKey]) newTasksRecord[dateKey] = [];
         newTasksRecord[dateKey].push(task);
      });
      setTasks(newTasksRecord);
    });

    return () => unsubscribe();
  }, [activeDate]);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('isOverdue', '==', true), where('completed', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      for (const docSnap of snapshot.docs) {
        if (!alertedTasks.current.has(docSnap.id)) {
           setHasPendingOverdueAlert(true);
           setPendingOverdueTaskTitle(docSnap.data().title || "Untitled Task");
           setPendingOverdueTaskId(docSnap.id);
           break;
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const hasSweptForDate = useRef<string | null>(null);

  useEffect(() => {
    // Failsafe: only run if we have tasks and haven't swept for this activeDate
    if (Object.keys(tasks).length === 0 || hasSweptForDate.current === activeDate) {
      return;
    }

    let needsUpdate = false;
    const cleanedTasks: Record<string, Task[]> = {};

    Object.keys(tasks).forEach(dateKey => {
      if (dateKey < activeDate) {
        const originalLength = tasks[dateKey].length;
        const filtered = tasks[dateKey].filter(task => {
          if (!task.completed) {
            // Clear Stale Tasks: permanently delete from Firestore
            deleteDoc(doc(db, "tasks", task.id)).catch(console.error);
            return false;
          }
          return true; // Preserve Analytics: Keep successfully completed tasks
        });

        if (filtered.length !== originalLength) {
          needsUpdate = true;
        }

        if (filtered.length > 0) {
          cleanedTasks[dateKey] = filtered;
        }
      } else {
        cleanedTasks[dateKey] = tasks[dateKey];
      }
    });

    hasSweptForDate.current = activeDate;

    if (needsUpdate) {
      // State Update: Save cleaned dictionary back and commit to localStorage
      setTasks(cleanedTasks);
      localStorage.setItem('daily_tasks', JSON.stringify(cleanedTasks));
    }
  }, [activeDate, tasks]);

  return (
    <ChatContext.Provider value={{
      isOpen, setIsOpen,
      messages, setMessages,
      input, setInput,
      loading, setLoading,
      hasPendingOverdueAlert, setHasPendingOverdueAlert,
      pendingOverdueTaskTitle, setPendingOverdueTaskTitle,
      pendingOverdueTaskId, setPendingOverdueTaskId,
      contextOverride, setContextOverride,
      alertedTasks,
      tasks, setTasks,
      activeDate, setActiveDate
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
