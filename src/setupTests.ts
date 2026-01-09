import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      save: vi.fn(),
    }),
  },
}));

vi.mock('@tauri-apps/plugin-autostart', () => ({
  enable: vi.fn(),
  disable: vi.fn(),
  isEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    hide: vi.fn(),
    show: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    innerSize: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
    setPosition: vi.fn(),
  }),
  currentMonitor: vi.fn().mockResolvedValue({
    size: { width: 1920, height: 1080 }
  }),
  PhysicalPosition: vi.fn(),
}));

// Mock Translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));
