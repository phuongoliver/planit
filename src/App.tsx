import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow, PhysicalPosition, currentMonitor } from "@tauri-apps/api/window";
import { Settings, RefreshCw, Moon, Sun, X } from "lucide-react";
import { Task } from "./types";
import { TaskCard } from "./components/TaskCard";
import { SettingsPage } from "./components/Settings";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<"tasks" | "settings">("tasks");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentials, setCredentials] = useState<{ token: string; dbId: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.9);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      const store = await Store.load('settings.json');

      // Determine Token
      let token = '';
      try {
        token = await invoke<string>('get_api_token');
      } catch (e) {
        // Fallback or not migrated yet
        token = await store.get<string>('notion_token') || '';
      }

      const taskDbId = await store.get<string>('tasks_db_id');
      const themePref = await store.get<string>('theme');

      // Window Settings
      const anchorPos = await store.get<string>('anchor_position');
      const alwaysOnTop = await store.get<boolean>('always_on_top');
      const opacity = await store.get<number>('window_opacity');
      if (opacity) setBgOpacity(opacity);
      applyWindowSettings(anchorPos, alwaysOnTop);

      const hasSeenOnboarding = await store.get<boolean>('has_seen_onboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

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

  const handleCloseOnboarding = async () => {
    setShowOnboarding(false);
    const store = await Store.load('settings.json');
    await store.set('has_seen_onboarding', true);
    await store.save();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + R: Refresh
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (credentials) {
          fetchTasks(credentials.token, credentials.dbId);
        }
      }
      // Ctrl + ,: Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setView("settings");
      }
      // Esc: Hide window (if in tasks view and not onboarding)
      if (e.key === 'Escape') {
        if (showOnboarding) {
          handleCloseOnboarding();
        } else if (view === 'settings') {
          setView('tasks');
        } else {
          getCurrentWindow().hide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [credentials, showOnboarding, view]);

  if (view === "settings") {
    return <SettingsPage
      onSave={() => window.location.reload()}
      onBack={() => setView("tasks")}
      theme={theme}
      currentOpacity={bgOpacity}
    />;
  }

  // Sort tasks: Urgent (Do Date closest/passed) first? Or by creation?
  // Use simplistic sorting for now.
  const sortedTasks = [...tasks];

  return (
    <div
      className="min-h-screen text-brand-dark dark:text-white font-sans selection:bg-brand-primary/30 transition-colors duration-300"
      style={{
        backgroundColor: theme === 'dark'
          ? `rgba(26, 30, 35, ${bgOpacity})` // brand-dark #1a1e23
          : `rgba(255, 255, 255, ${bgOpacity})`
      }}
    >

      {/* Header - Minimalist & Glassy */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-2 sm:px-4 bg-white/80 dark:bg-brand-dark/80 backdrop-blur-md border-b border-brand-gray/20 dark:border-brand-gray/10 select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <img src={theme === "dark" ? "/logo-notext-light.png" : "/logo-notext-dark.png"} alt="PlanIt" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg sm:text-xl tracking-tight text-brand-dark dark:text-white">{t('app.title')}</span>
        </div>

        {/* Draggable spacer */}
        <div data-tauri-drag-region className="flex-1 h-full" />

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60"
            title={t('app.theme')}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => credentials && fetchTasks(credentials.token, credentials.dbId)}
            className={clsx(
              "p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60",
              loading && "animate-spin"
            )}
            title={t('app.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setView("settings")}
            className="p-2 rounded-full hover:bg-brand-gray/20 dark:hover:bg-white/10 transition-colors text-brand-dark/60 dark:text-white/60"
            title={t('app.settings')}
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-brand-gray/20 dark:bg-white/10 mx-1" />

          <button
            onClick={() => getCurrentWindow().hide()}
            className="p-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors text-brand-dark/60 dark:text-white/60"
            title={t('app.hide_tray')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-8 px-2 sm:px-4 max-w-2xl mx-auto flex flex-col gap-4">

        {!isConfigured ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <p>{t('app.configure_notion')}</p>
          </div>
        ) : tasks.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
            <div className="text-4xl">✨</div>
            <p className="text-sm font-medium">{t('app.all_clear')}</p>
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

      {showOnboarding && (
        <OnboardingGuide
          onClose={handleCloseOnboarding}
          theme={theme}
        />
      )}
    </div >
  );
}


export default App;
