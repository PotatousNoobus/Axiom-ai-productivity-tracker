"use client";
import { useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, CheckCircle2, Target, Lightbulb, Zap, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useChat, Message } from './ChatContext';

interface ChatPanelProps {
  userProfile?: 'Student' | 'Working Professional' | 'Startup Founder';
  activeDate?: string;
}

export default function ChatPanel({ userProfile = 'Student', activeDate }: ChatPanelProps) {
  const {
    isOpen, setIsOpen,
    messages, setMessages,
    input, setInput,
    loading, setLoading,
    hasPendingOverdueAlert, setHasPendingOverdueAlert,
    pendingOverdueTaskTitle,
    pendingOverdueTaskId,
    contextOverride, setContextOverride,
    alertedTasks
  } = useChat();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleFabClick = () => {
    setIsOpen(true);
    if (hasPendingOverdueAlert) {
      setHasPendingOverdueAlert(false);
      alertedTasks.current.add(pendingOverdueTaskId);
      const msg = `Looks like "${pendingOverdueTaskTitle}" was missed. Should I try to squeeze it in later today, or do you want to mark it as overflow for tomorrow?`;
      setMessages(prev => [...prev, { role: 'assistant', text: msg }]);
      setContextOverride(`The user missed the task "${pendingOverdueTaskTitle}". Help them reschedule it later today, or move it to tomorrow. Adjust their daily plan accordingly.`);
    }
  };

  useEffect(() => {
    // Only set greeting if messages is empty so it doesn't overwrite existing chat history
    if (messages.length === 0) {
      let tailoredGreeting = "";

      if (userProfile === 'Student') {
        tailoredGreeting = "Hello! I'm your Student Productivity Companion. Ready to break down those heavy course loads, plan around your classes, and ace those upcoming exams? Let's turn your syllabus into actionable, bite-sized steps!";
      } else if (userProfile === 'Working Professional') {
        tailoredGreeting = "Welcome back! As your Professional AI Companion, I'm here to safeguard your 9-to-5 boundaries, organize deep-work blocks, and help you crush your milestones without the burnout. What deliverables are we breaking down today?";
      } else if (userProfile === 'Startup Founder') {
        tailoredGreeting = "Let's build something epic. As your Founder AI Partner, I'm calibrated for high volatility and ruthless prioritization. Whether we are tackling burn-rate challenges, scaling growth, or handling immediate fires, let's execute fast. What's the top priority today?";
      } else {
        tailoredGreeting = "Hello! I'm your AI Productivity Companion. Ready to break down some massive tasks?";
      }

      setMessages([
        { role: 'assistant', text: tailoredGreeting }
      ]);
      setInput('');
    }
  }, [userProfile, messages.length, setMessages, setInput]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      let historicalContext = "";
      try {
        const historyStr = localStorage.getItem('historicalContext');
        if (historyStr) {
          const historyArr = JSON.parse(historyStr);
          if (Array.isArray(historyArr) && historyArr.length > 0) {
            historicalContext = historyArr.join("\n");
          }
        }
      } catch (e) {
        console.error("Failed to parse historicalContext", e);
      }

      let userApiKey = "";
      try {
        const storedKey = localStorage.getItem("USER_GEMINI_API_KEY");
        if (storedKey) {
          userApiKey = storedKey.trim();
        }
      } catch (e) {
        console.error("Failed to read userApiKey from localStorage", e);
      }

      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const currentTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const chatHistory = messages.map(msg => ({
        role: msg.role,
        text: msg.text || "",
      }));

      const res = await fetch('/api/breakdown', {
        method: 'POST',
        body: JSON.stringify({ taskDescription: userMsg, userProfile, activeDate, historicalContext, userApiKey, contextOverride, currentTasks, chatHistory }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.error }]);
      } else {
        const assistantText = data.message || "I've updated your tasks.";
        setMessages(prev => [...prev, { role: 'assistant', text: assistantText, data }]);
        
        if (
          (data.addedTasks && data.addedTasks.length > 0) ||
          (data.updatedTasks && data.updatedTasks.length > 0) ||
          (data.deletedTaskIds && data.deletedTaskIds.length > 0)
        ) {
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('ai_action', { detail: { 
              addedTasks: data.addedTasks || [],
              updatedTasks: data.updatedTasks || [],
              deletedTaskIds: data.deletedTaskIds || []
            } });
            window.dispatchEvent(event);
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', text: "Error: Could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderAssistantMessage = (msg: Message) => {
    if (msg.text) {
      return (
        <div className="p-3 rounded-2xl md:max-w-[85%] text-sm leading-relaxed bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/50 text-slate-800 dark:text-gray-300 rounded-tl-sm shadow-sm">
          {msg.text}
        </div>
      );
    }

    const { data } = msg;
    if (!data) return null;

    return (
      <div className="space-y-4 w-full">
        {data.coachingTip && (
          <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800/50 text-cyan-900 dark:text-cyan-100 text-sm flex gap-3 rounded-tl-none items-start shadow-sm">
            <Lightbulb size={18} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{data.coachingTip}</p>
          </div>
        )}

        {data.milestone && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-950 dark:text-indigo-100 text-sm rounded-tl-none shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-indigo-800 dark:text-indigo-300">Milestone</h4>
            </div>
            <p className="text-lg font-medium">{data.milestone}</p>
          </div>
        )}

        {data.tasks && (
          <div className="space-y-2">
            {data.tasks.map((task: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-gray-200 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-900 text-slate-600 dark:text-gray-400">{task.durationMinutes}m</span>
                  {task.energyRequired && (
                    <span className={`px-2 py-1 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${task.energyRequired === 'high' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
                      <Zap size={10} />
                      {task.energyRequired}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.steps && (
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-700 before:to-transparent">
            {data.steps.map((step: any, idx: number) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-[.is-active]:text-indigo-600 group-[.is-active]:dark:text-indigo-400 group-[.is-active]:border-indigo-200 dark:group-[.is-active]:border-indigo-500/30 group-[.is-active]:bg-indigo-50 dark:group-[.is-active]:bg-indigo-900/20 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xs font-bold">
                  {step.sequence || idx + 1}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex flex-col gap-2 shadow-sm">
                  <span className="text-sm font-medium text-slate-800 dark:text-gray-200 leading-snug">{step.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400">{step.durationMinutes}m</span>
                    {step.requiresBlock && (
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${step.requiresBlock === 'deep-work' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'}`}>
                        {step.requiresBlock.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.profileInsights?.adaptationMade && (
          <div className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
            " {data.profileInsights.adaptationMade} "
          </div>
        )}

        {data.interstitialQuestion && (
          <div className="p-3 rounded-2xl md:max-w-[85%] bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/50 text-slate-800 dark:text-gray-300 text-sm leading-relaxed rounded-tl-sm shadow-sm">
            {data.interstitialQuestion}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile FAB */}
      <button 
        onClick={handleFabClick}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(34,211,238,0.4)] z-40 hover:bg-cyan-400 transition-transform hover:scale-105 focus:outline-none"
      >
        <MessageSquare size={24} className="text-white" />
        {hasPendingOverdueAlert && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <aside className={`
        fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl transition-transform duration-300 ease-out transform
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        lg:static lg:translate-y-0 lg:h-full lg:rounded-none lg:w-[30%] lg:min-w-[320px] lg:max-w-[420px]
        border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#161b22] flex flex-col shrink-0
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 flex items-center justify-between lg:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse"></div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-900 dark:text-white">AI Productivity Companion</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-slate-950 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-cyan-600 dark:text-cyan-400'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              {msg.role === 'user' ? (
                <div className="p-3 rounded-2xl max-w-[80%] md:max-w-[85%] text-sm leading-relaxed bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/50 text-slate-800 dark:text-cyan-50 rounded-tr-sm shadow-sm">
                  {msg.text}
                </div>
              ) : (
                renderAssistantMessage(msg)
              )}
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
               <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-cyan-600 dark:text-cyan-400">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl md:max-w-[85%] bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-gray-300 flex items-center gap-2 rounded-tl-sm border border-gray-200 dark:border-slate-700/30 shadow-sm">
                <Loader2 size={16} className="text-cyan-600 dark:text-cyan-400 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 mt-auto">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Enter a massive task to break down..."
            className="w-full bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-xl p-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-gray-400 dark:placeholder-gray-600 text-slate-900 dark:text-white transition-all shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-cyan-500 text-white shadow-lg hover:bg-cyan-400 hover:-translate-y-1/2 hover:scale-105 disabled:opacity-50 disabled:hover:bg-cyan-500 disabled:hover:scale-100 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
