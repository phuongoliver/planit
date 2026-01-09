import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow, PhysicalPosition, currentMonitor } from "@tauri-apps/api/window";
import { Settings, RefreshCw, Moon, Sun } from "lucide-react";
import { Task } from "./types";
import { TaskCard } from "./components/TaskCard";
import { SettingsPage } from "./components/Settings";
import { clsx } from "clsx";

function App() {
  const [view, setView] = useState<"tasks" | "settings">("tasks");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentials, setCredentials] = useState<{ token: string; dbId: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const store = await Store.load('settings.json');
      const token = await store.get<string>('notion_token');
      const taskDbId = await store.get<string>('tasks_db_id');
      const themePref = await store.get<string>('theme');

      // Window Settings
      const anchorPos = await store.get<string>('anchor_position');
      const alwaysOnTop = await store.get<boolean>('always_on_top');
      applyWindowSettings(anchorPos, alwaysOnTop);

      if (themePref) {
        setTheme(themePref as "light" | "dark");
        if (themePref === "dark") document.documentElement.classList.add("dark");
      } else {
        // Default to dark mode for premium feel
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }

      if (token && taskDbId) {
        setCredentials({ token, dbId: taskDbId });
        setIsConfigured(true);
        fetchTasks(token, taskDbId);
      } else {
        setView("settings");
      }
    };
    init();
  }, []);

  const applyWindowSettings = async (anchor: string | null | undefined, alwaysOnTop: boolean | null | undefined) => {
    const appWindow = getCurrentWindow();

    // Apply Always on Top
    if (alwaysOnTop !== undefined && alwaysOnTop !== null) {
      await appWindow.setAlwaysOnTop(alwaysOnTop);
    }

    // Apply Anchor Position
    if (anchor && anchor !== 'none') {
      const monitor = await currentMonitor();
      if (!monitor) return;

      const windowSize = await appWindow.innerSize();
      const screenWidth = monitor.size.width;
      const screenHeight = monitor.size.height;

      const PADDING = 24; // Aesthetic padding
      let x = 0;
      let y = 0;

      switch (anchor) {
        case 'top-left':
          x = PADDING;
          y = PADDING;
          break;
        case 'top-right':
          x = screenWidth - windowSize.width - PADDING;
          y = PADDING;
          break;
        case 'bottom-left':
          x = PADDING;
          y = screenHeight - windowSize.height - PADDING;
          break;
        case 'bottom-right':
          x = screenWidth - windowSize.width - PADDING;
          y = screenHeight - windowSize.height - PADDING;
          break;
      }

      await appWindow.setPosition(new PhysicalPosition(x, y));
    }
  };

  const fetchTasks = async (token: string, dbId: string) => {
    setLoading(true);
    try {
      const res = await invoke<Task[]>("fetch_tasks", { token, databaseId: dbId });
      console.log("Fetched tasks from Notion:", res);
      setTasks(res);
    } catch (e) {
      console.error("Fetch failed", e);
      alert(`Failed to fetch tasks: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    const html = document.documentElement;
    if (newTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    const store = await Store.load('settings.json');
    await store.set('theme', newTheme);
    await store.save();
  };

  if (view === "settings") {
    return <SettingsPage onSave={() => window.location.reload()} />;
  }

  // Sort tasks: Urgent (Do Date closest/passed) first? Or by creation?
  // Use simplistic sorting for now.
  const sortedTasks = [...tasks];

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark text-brand-dark dark:text-white font-sans selection:bg-brand-primary/30 transition-colors duration-300">

      {/* Header - Minimalist & Glassy */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-2 sm:px-4 bg-white/80 dark:bg-brand-dark/80 backdrop-blur-md border-b border-brand-gray/20 dark:border-brand-gray/10">
        <div className="flex items-center gap-2">
          <img src={theme === "dark" ? "/logo-notext-light.png" : "/logo-notext-dark.png"} alt="PlanIt" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg sm:text-xl tracking-tight text-brand-dark dark:text-white">PlanIt</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => credentials && fetchTasks(credentials.token, credentials.dbId)}
            className={clsx(
              "p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60",
              loading && "animate-spin"
            )}
            title="Refresh Tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setView("settings")}
            className="p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-8 px-2 sm:px-4 max-w-2xl mx-auto flex flex-col gap-4">

        {!isConfigured ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <p>Configure Notion access in settings.</p>
          </div>
        ) : tasks.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
            <div className="text-4xl">✨</div>
            <p className="text-sm font-medium">All tasks clear for today</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white/50 dark:bg-brand-dark/50 shadow-sm border border-brand-gray/20 dark:border-brand-gray/10 backdrop-blur-sm">
            {sortedTasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                index={idx}
                notionToken={credentials?.token || ''}
                onComplete={() => { }}
              />
            ))}
          </div>
        )
        }
      </main >
    </div >
  );
}

export default App;
