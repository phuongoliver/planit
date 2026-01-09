import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import {
  Settings, Save, AlertCircle, Layout, ArrowUpRight, ArrowDownRight, ArrowDownLeft, ArrowUpLeft, Maximize,
  ChevronLeft, Database, AppWindow, Sliders, Zap, Globe, RefreshCw
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useTranslation } from 'react-i18next';
import { OnboardingContent } from './OnboardingGuide';

interface SettingsData {
  notionToken: string;
  objectiveDbId: string;
  tasksDbId: string;
  anchorPosition: 'none' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  alwaysOnTop: boolean;
  windowOpacity: number;
  autostart: boolean;
  language: string;
}

type Tab = 'guide' | 'notion' | 'behavior' | 'window';

export interface SettingsPageProps {
  readonly onSave: () => void;
  readonly onBack: () => void;
  readonly theme: 'light' | 'dark';
  readonly currentOpacity: number;
}

export function SettingsPage({ onSave, onBack, theme, currentOpacity }: SettingsPageProps) {
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<SettingsData>({
    notionToken: '',
    objectiveDbId: '',
    tasksDbId: '',
    anchorPosition: 'none',
    alwaysOnTop: false,
    windowOpacity: currentOpacity,
    autostart: false,
    language: i18n.language || 'en',
  });
  const [activeTab, setActiveTab] = useState<Tab>('guide');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isSidebarOpen] = useState(true); // Toggle for sidebar
  const [availableDbs, setAvailableDbs] = useState<{ id: string, title: string }[]>([]);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const store = await Store.load('settings.json');

      // Migration: Try to get from secure storage first
      let token = '';
      try {
        token = await invoke<string>('get_api_token');
      } catch (e) {
        // If not in secure storage, check legacy store
        token = await store.get<string>('notion_token') || '';
      }

      const objId = await store.get<string>('objective_db_id');
      const taskId = await store.get<string>('tasks_db_id');
      const anchor = await store.get<string>('anchor_position');
      const onTop = await store.get<boolean>('always_on_top');
      const opacity = await store.get<number>('window_opacity');
      const autoStartEnabled = await isEnabled();
      const lang = await store.get<string>('language');

      if (lang) {
        i18n.changeLanguage(lang);
      }

      setData({
        notionToken: token || '',
        objectiveDbId: objId || '',
        tasksDbId: taskId || '',
        anchorPosition: (anchor as any) || 'none',
        alwaysOnTop: onTop || false,
        windowOpacity: opacity || 0.9,
        autostart: autoStartEnabled,
        language: lang || i18n.language || 'en'
      });
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    // Basic validation
    if (!data.notionToken || !data.objectiveDbId || !data.tasksDbId) {
      alert(t('settings.error_required'));
      setStatus('idle');
      return;
    }

    const store = await Store.load('settings.json');

    // Save token to secure storage
    try {
      await invoke('save_api_token', { token: data.notionToken });
      // Remove from legacy store if it exists acting as cleanup/migration
      await store.delete('notion_token');
    } catch (e) {
      console.error("Failed to save to secure storage", e);
      // Fallback or alert user - but for now just log
    }

    await store.set('objective_db_id', data.objectiveDbId);
    await store.set('tasks_db_id', data.tasksDbId);
    await store.set('anchor_position', data.anchorPosition);
    await store.set('always_on_top', data.alwaysOnTop);
    await store.set('window_opacity', data.windowOpacity);
    await store.set('language', data.language);
    await store.save();

    i18n.changeLanguage(data.language);

    // Apply Autostart
    try {
      if (data.autostart) {
        await enable();
      } else {
        await disable();
      }
    } catch (e) {
      console.error('Failed to toggle autostart', e);
    }

    setStatus('saved');
    setTimeout(() => {
      setStatus('idle');
      onSave();
    }, 500);
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={twMerge(
        "w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
        activeTab === id
          ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-white"
          : "text-brand-dark/60 dark:text-brand-gray/60 hover:bg-brand-gray/5 dark:hover:bg-white/5"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {isSidebarOpen && <span>{label}</span>}
    </button>
  );

  // Cleanup on unmount (optional, but good practice if we want to reset or relying on next page to set it)
  // Reverting to inline styles as the CSS variable approach caused a white screen flash

  return (
    <div
      className="flex h-full text-brand-dark dark:text-white overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: theme === 'dark'
          ? `rgba(26, 30, 35, ${data.windowOpacity})`
          : `rgba(255, 255, 255, ${data.windowOpacity})`
      }}
    >

      {/* Sidebar - Togglable */}
      <div className={twMerge(
        "flex flex-col border-r border-brand-gray/20 dark:border-brand-gray/10 transition-all duration-300",
        isSidebarOpen ? "w-1/3 min-w-[120px]" : "w-[60px]"
      )}>
        <div data-tauri-drag-region className="p-4 flex items-center justify-between border-b border-brand-gray/20 dark:border-brand-gray/10 h-16">
          {isSidebarOpen ? (
            <div data-tauri-drag-region className="flex items-center gap-2 font-bold text-lg cursor-default select-none">
              <Settings className="w-5 h-5 pointer-events-none" />
              <span className="pointer-events-none">{t('settings.title')}</span>
            </div>
          ) : (
            <Settings data-tauri-drag-region className="w-6 h-6 mx-auto text-brand-dark/50 cursor-default" />
          )}
        </div>

        {/* Back Button - Top */}
        <div className="p-2 border-b border-brand-gray/20 dark:border-brand-gray/10">
          <button
            onClick={onBack}
            className="w-full p-2 flex items-center justify-center gap-2 text-brand-dark/60 dark:text-brand-gray/60 hover:text-brand-dark dark:hover:text-white transition-colors rounded-lg hover:bg-brand-gray/5 dark:hover:bg-white/5"
            title="Back without saving"
          >
            <ChevronLeft className="w-5 h-5" />
            {isSidebarOpen && <span className="text-xs font-medium">{t('settings.back')}</span>}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <SidebarItem id="guide" icon={AlertCircle} label={t('settings.tabs.guide')} />
          <SidebarItem id="notion" icon={Database} label={t('settings.tabs.notion')} />
          <SidebarItem id="behavior" icon={Zap} label={t('settings.tabs.behavior')} />
          <SidebarItem id="window" icon={AppWindow} label={t('settings.tabs.window')} />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header for Mobile/Context */}
        <div data-tauri-drag-region className="h-16 flex items-center justify-between px-6 border-b border-brand-gray/20 dark:border-brand-gray/10 shrink-0 cursor-default select-none">
          <h2 data-tauri-drag-region className="text-xl font-bold pointer-events-none">
            {activeTab === 'guide' && t('settings.headers.guide')}
            {activeTab === 'notion' && t('settings.headers.notion')}
            {activeTab === 'behavior' && t('settings.headers.behavior')}
            {activeTab === 'window' && t('settings.headers.window')}
          </h2>
          {/* Quick Save Button */}
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className={twMerge(
              "px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all pointer-events-auto",
              "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm",
              status === 'saving' && "opacity-70 cursor-wait",
              status === 'saved' && "bg-green-500 hover:bg-green-600"
            )}
          >
            <Save className="w-4 h-4" />
            {status === 'saving' ? t('settings.saving') : status === 'saved' ? t('settings.saved') : t('settings.save')}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {activeTab === 'guide' && (
            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
              <OnboardingContent theme={theme} />
            </div>
          )}

          {activeTab === 'notion' && (
            <div className="space-y-6 max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-brand-primary/5 border border-brand-primary/20 p-4 rounded-lg flex gap-3 text-sm text-brand-dark/80 dark:text-brand-gray">
                <AlertCircle className="w-5 h-5 text-brand-primary shrink-0" />
                <p>{t('settings.notion.info')}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">{t('settings.notion.token_label')}</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={data.notionToken}
                      onChange={e => setData({ ...data, notionToken: e.target.value })}
                      className="flex-1 p-2.5 rounded-lg border border-brand-gray/30 dark:border-brand-gray/20 bg-brand-gray/5 dark:bg-black/20 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      placeholder={t('settings.notion.placeholder_token')}
                    />
                    <button
                      onClick={async () => {
                        if (!data.notionToken) {
                          alert(t('settings.error_required'));
                          return;
                        }
                        setIsFetchingInfo(true);
                        try {
                          const DBS = await invoke<{ id: string, title: string }[]>('fetch_databases', { token: data.notionToken });
                          setAvailableDbs(DBS);
                        } catch (e) {
                          alert(`Failed to fetch databases: ${e}`);
                        } finally {
                          setIsFetchingInfo(false);
                        }
                      }}
                      className="px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-lg transition-colors"
                      title="Load databases"
                    >
                      {isFetchingInfo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">{t('settings.notion.obj_db_label')}</label>
                  {availableDbs.length > 0 ? (
                    <select
                      value={data.objectiveDbId}
                      onChange={e => setData({ ...data, objectiveDbId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-brand-gray/30 dark:border-brand-gray/20 bg-brand-gray/5 dark:bg-black/20 focus:ring-2 focus:ring-brand-primary outline-none transition-all text-sm"
                    >
                      <option value="">Select Database...</option>
                      {availableDbs.map(db => (
                        <option key={db.id} value={db.id}>{db.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={data.objectiveDbId}
                      onChange={e => setData({ ...data, objectiveDbId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-brand-gray/30 dark:border-brand-gray/20 bg-brand-gray/5 dark:bg-black/20 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-mono text-xs"
                      placeholder={t('settings.notion.placeholder_id')}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">{t('settings.notion.task_db_label')}</label>
                  {availableDbs.length > 0 ? (
                    <select
                      value={data.tasksDbId}
                      onChange={e => setData({ ...data, tasksDbId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-brand-gray/30 dark:border-brand-gray/20 bg-brand-gray/5 dark:bg-black/20 focus:ring-2 focus:ring-brand-primary outline-none transition-all text-sm"
                    >
                      <option value="">Select Database...</option>
                      {availableDbs.map(db => (
                        <option key={db.id} value={db.id}>{db.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={data.tasksDbId}
                      onChange={e => setData({ ...data, tasksDbId: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-brand-gray/30 dark:border-brand-gray/20 bg-brand-gray/5 dark:bg-black/20 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-mono text-xs"
                      placeholder={t('settings.notion.placeholder_id')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}


          {
            activeTab === 'behavior' && (
              <div className="space-y-6 max-w-md animate-in fade-in slide-in-from-right-4 duration-300">

                <section className="space-y-3">
                  <h3 className="text-sm uppercase tracking-wider font-bold text-brand-dark/50 dark:text-brand-gray/50">{t('settings.headers.system')}</h3>

                  {/* Language Selector */}
                  <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-brand-dark/50 border-brand-gray/20">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-brand-dark/70 dark:text-brand-gray/70" />
                      <div className="text-left">
                        <span className="block font-medium text-sm">{t('settings.behavior.language.title')}</span>
                        <span className="block text-xs opacity-70">{t('settings.behavior.language.desc')}</span>
                      </div>
                    </div>
                    <select
                      value={data.language}
                      onChange={(e) => setData({ ...data, language: e.target.value })}
                      className="bg-brand-gray/10 dark:bg-black/20 border border-brand-gray/20 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="en">English</option>
                      <option value="vi">Tiếng Việt</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setData({ ...data, autostart: !data.autostart })}
                    className={twMerge(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                      data.autostart
                        ? "bg-brand-primary/10 border-brand-primary/50 text-brand-primary dark:text-white"
                        : "bg-white dark:bg-brand-dark/50 border-brand-gray/20 hover:bg-brand-gray/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-medium text-sm">{t('settings.behavior.autostart.title')}</span>
                        <span className="block text-xs opacity-70">{t('settings.behavior.autostart.desc')}</span>
                      </div>
                    </div>
                    <div className={twMerge(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      data.autostart ? "bg-brand-primary border-brand-primary" : "border-brand-gray/40"
                    )}>
                      {data.autostart && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>

                  <button
                    onClick={() => setData({ ...data, alwaysOnTop: !data.alwaysOnTop })}
                    className={twMerge(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                      data.alwaysOnTop
                        ? "bg-brand-primary/10 border-brand-primary/50 text-brand-primary dark:text-white"
                        : "bg-white dark:bg-brand-dark/50 border-brand-gray/20 hover:bg-brand-gray/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Layout className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-medium text-sm">{t('settings.behavior.always_on_top.title')}</span>
                        <span className="block text-xs opacity-70">{t('settings.behavior.always_on_top.desc')}</span>
                      </div>
                    </div>
                    <div className={twMerge(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      data.alwaysOnTop ? "bg-brand-primary border-brand-primary" : "border-brand-gray/40"
                    )}>
                      {data.alwaysOnTop && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                </section>

              </div>
            )
          }

          {activeTab === 'window' && (
            <div className="space-y-8 max-w-md animate-in fade-in slide-in-from-right-4 duration-300">

              {/* Anchor Section */}
              <section className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-brand-dark/50 dark:text-brand-gray/50">{t('settings.headers.position')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'top-left', icon: ArrowUpLeft, label: t('settings.window.positions.top_left') },
                    { id: 'top-right', icon: ArrowUpRight, label: t('settings.window.positions.top_right') },
                    { id: 'none', icon: Maximize, label: t('settings.window.positions.free') },
                    { id: 'bottom-left', icon: ArrowDownLeft, label: t('settings.window.positions.bot_left') },
                    { id: 'bottom-right', icon: ArrowDownRight, label: t('settings.window.positions.bot_right') },
                  ].map((opt) => {
                    // Only render valid grid items or placeholders
                    const isVisible = opt.id === 'none' || opt.id.includes('left') || opt.id.includes('right');
                    if (!isVisible) return <div key={opt.id} />;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => setData({ ...data, anchorPosition: opt.id as any })}
                        className={twMerge(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200",
                          data.anchorPosition === opt.id
                            ? "bg-brand-primary text-white border-brand-primary shadow-md scale-105"
                            : "bg-white dark:bg-brand-dark/50 border-brand-gray/20 hover:border-brand-primary/50 hover:bg-brand-primary/5"
                        )}
                        style={{ gridColumn: opt.id === 'top-left' ? 1 : opt.id === 'none' ? 2 : opt.id === 'top-right' ? 3 : opt.id === 'bottom-left' ? 1 : 3 }}
                      >
                        <opt.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-brand-dark/50 dark:text-brand-gray/50">
                  {t('settings.window.snap_desc')}
                </p>
              </section>

              {/* Transparency Section */}
              <section className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-brand-dark/50 dark:text-brand-gray/50">{t('settings.headers.transparency')}</h3>

                {/* Opacity Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sliders className="w-5 h-5 text-brand-dark/50 dark:text-brand-gray/60" />
                      <div>
                        <span className="block font-medium text-sm">{t('settings.window.opacity.title')}</span>
                        <span className="block text-xs opacity-70">{t('settings.window.opacity.desc')}</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold bg-brand-gray/10 dark:bg-white/10 px-2 py-1 rounded">
                      {Math.round(data.windowOpacity * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={data.windowOpacity}
                    onChange={(e) => setData({ ...data, windowOpacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-brand-gray/20 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>
              </section>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
