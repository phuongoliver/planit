import { useState, useEffect } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { Settings, Save, AlertCircle, Layout, ArrowUpRight, ArrowDownRight, ArrowDownLeft, ArrowUpLeft, Maximize } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface SettingsData {
  notionToken: string;
  objectiveDbId: string;
  tasksDbId: string;
  anchorPosition: 'none' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  alwaysOnTop: boolean;
}

export function SettingsPage({ onSave }: { readonly onSave: () => void }) {
  const [data, setData] = useState<SettingsData>({
    notionToken: '',
    objectiveDbId: '',
    tasksDbId: '',
    anchorPosition: 'none',
    alwaysOnTop: false,
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const loadSettings = async () => {
      const store = await Store.load('settings.json');
      const token = await store.get<string>('notion_token');
      const objId = await store.get<string>('objective_db_id');
      const taskId = await store.get<string>('tasks_db_id');
      const anchor = await store.get<string>('anchor_position');
      const onTop = await store.get<boolean>('always_on_top');

      setData({
        notionToken: token || '',
        objectiveDbId: objId || '',
        tasksDbId: taskId || '',
        anchorPosition: (anchor as any) || 'none',
        alwaysOnTop: onTop || false,
      });
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    // Basic validation
    if (!data.notionToken || !data.objectiveDbId || !data.tasksDbId) {
      alert("All fields are required");
      setStatus('idle');
      return;
    }

    const store = await Store.load('settings.json');
    await store.set('notion_token', data.notionToken);
    await store.set('objective_db_id', data.objectiveDbId);
    await store.set('tasks_db_id', data.tasksDbId);
    await store.set('anchor_position', data.anchorPosition);
    await store.set('always_on_top', data.alwaysOnTop);
    await store.save();

    setStatus('saved');
    setTimeout(() => {
      setStatus('idle');
      onSave(); // Navigate back
    }, 500);
  };


  return (
    <div className="p-6 flex flex-col gap-6 h-full bg-white dark:bg-brand-dark text-brand-dark dark:text-white overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-brand-gray/20 dark:border-brand-gray/10 pb-4">
        <Settings className="w-6 h-6 text-brand-primary" />
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Notion Config Section */}
        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-brand-dark/50 dark:text-brand-gray/50 font-bold mb-2">Notion Configuration</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">Notion Integration Token</label>
            <input
              type="password"
              value={data.notionToken}
              onChange={e => setData({ ...data, notionToken: e.target.value })}
              className="w-full p-2 rounded border border-brand-gray/30 dark:border-brand-gray/20 bg-white dark:bg-brand-dark/50 focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="secret_..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">Objectives Database ID</label>
            <input
              type="text"
              value={data.objectiveDbId}
              onChange={e => setData({ ...data, objectiveDbId: e.target.value })}
              className="w-full p-2 rounded border border-brand-gray/30 dark:border-brand-gray/20 bg-white dark:bg-brand-dark/50 focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="32 character ID"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray">Tasks Database ID</label>
            <input
              type="text"
              value={data.tasksDbId}
              onChange={e => setData({ ...data, tasksDbId: e.target.value })}
              className="w-full p-2 rounded border border-brand-gray/30 dark:border-brand-gray/20 bg-white dark:bg-brand-dark/50 focus:ring-2 focus:ring-brand-primary outline-none"
              placeholder="32 character ID"
            />
          </div>
        </section>

        {/* Window Config Section */}
        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-brand-dark/50 dark:text-brand-gray/50 font-bold mb-2">Window & Appearance</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray block">Anchor Position</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top-left', icon: ArrowUpLeft, label: 'TL' },
                  { id: 'none', icon: Maximize, label: 'Free' },
                  { id: 'top-right', icon: ArrowUpRight, label: 'TR' },
                  { id: 'bottom-left', icon: ArrowDownLeft, label: 'BL' },
                  { id: 'bottom-right', icon: ArrowDownRight, label: 'BR' },
                ].map((opt) => (
                  (opt.id === 'none' || opt.id.includes('left') || opt.id.includes('right')) && (
                    <button
                      key={opt.id}
                      onClick={() => setData({ ...data, anchorPosition: opt.id as any })}
                      className={twMerge(
                        "p-2 rounded border flex items-center justify-center transition-all",
                        data.anchorPosition === opt.id
                          ? "bg-brand-primary text-white border-brand-primary"
                          : "bg-white dark:bg-brand-dark/50 border-brand-gray/30 dark:border-brand-gray/20 hover:bg-brand-gray/10"
                      )}
                      title={opt.id}
                      style={{ gridColumn: opt.id === 'top-left' ? 1 : opt.id === 'none' ? 2 : opt.id === 'top-right' ? 3 : opt.id === 'bottom-left' ? 1 : 3 }}
                    >
                      <opt.icon className="w-4 h-4" />
                    </button>
                  )
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-dark/70 dark:text-brand-gray block">Behavior</label>
              <button
                onClick={() => setData({ ...data, alwaysOnTop: !data.alwaysOnTop })}
                className={twMerge(
                  "w-full p-2 rounded border flex items-center gap-2 justify-center transition-all",
                  data.alwaysOnTop
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white dark:bg-brand-dark/50 border-brand-gray/30 dark:border-brand-gray/20 hover:bg-brand-gray/10"
                )}
              >
                <Layout className="w-4 h-4" />
                <span className="text-sm">Always on Top</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className={twMerge(
            "w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors",
            "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm",
            status === 'saving' && "opacity-70 cursor-wait",
            status === 'saved' && "bg-green-500 hover:bg-green-600"
          )}
        >
          <Save className="w-4 h-4" />
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save & Continue'}
        </button>
      </div>

      <div className="bg-brand-primary/10 dark:bg-brand-gray/10 p-3 rounded-md flex gap-2 items-start text-xs text-brand-dark/60 dark:text-brand-gray">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Ensure your Integration is connected to both databases in Notion.</p>
      </div>
    </div>
  );
}
