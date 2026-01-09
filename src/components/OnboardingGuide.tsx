
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X, Settings, ArrowRight, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface OnboardingGuideProps {
    onClose: () => void;
    theme: 'light' | 'dark';
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onClose, theme }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className={clsx(
                    "w-full max-w-md p-6 rounded-2xl shadow-2xl transform transition-all scale-100",
                    "flex flex-col gap-6",
                    theme === 'dark'
                        ? "bg-[#1a1e23] border border-white/10 text-white"
                        : "bg-white border border-gray-100 text-[#1a1e23]"
                )}
            >
                <OnboardingContent theme={theme} onClose={onClose} />
            </div>
        </div>
    );
};

export const OnboardingContent = ({ theme, onClose }: { theme: 'light' | 'dark', onClose?: () => void }) => {
    const { t } = useTranslation();
    return (
        <>
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary mb-2">
                    <span className="text-2xl">✨</span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {t('onboarding.welcome')}
                </h2>
                <p className="text-sm opacity-70">
                    {t('onboarding.intro')}
                </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
                <Step number={1} text={t('onboarding.steps.step1')} theme={theme} />
                <Step number={2} text={t('onboarding.steps.step2')} theme={theme} />
                <Step number={3} text={t('onboarding.steps.step3')} theme={theme} />
            </div>

            {/* Shortcuts */}
            <div className={clsx("rounded-xl p-4", theme === 'dark' ? "bg-white/5" : "bg-gray-50")}>
                <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">
                    {t('onboarding.shortcuts.title')}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    <ShortcutItem
                        icon={<RefreshCw className="w-4 h-4" />}
                        label={t('onboarding.shortcuts.refresh')}
                        keys={['Ctrl', 'R']}
                        theme={theme}
                    />
                    <ShortcutItem
                        icon={<Settings className="w-4 h-4" />}
                        label={t('onboarding.shortcuts.settings')}
                        keys={['Ctrl', ',']}
                        theme={theme}
                    />
                    <ShortcutItem
                        icon={<Zap className="w-4 h-4" />}
                        label={t('onboarding.shortcuts.toggle')}
                        keys={['Ctrl', 'Space']}
                        theme={theme}
                    />
                    <ShortcutItem
                        icon={<X className="w-4 h-4" />}
                        label={t('onboarding.shortcuts.hide')}
                        keys={['Esc']}
                        theme={theme}
                    />
                </div>
            </div>

            {/* Action */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-medium shadow-lg shadow-brand-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {t('onboarding.button')}
                    <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </>
    );
};

const Step = ({ number, text, theme }: { number: number, text: string, theme: string }) => (
    <div className="flex items-start gap-3">
        <div className={clsx(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
            theme === 'dark' ? "bg-white/10 text-white" : "bg-black/5 text-black"
        )}>
            {number}
        </div>
        <p className="text-sm leading-relaxed opacity-80">{text}</p>
    </div>
);

const ShortcutItem = ({ icon, label, keys, theme }: { icon: React.ReactNode, label: string, keys: string[], theme: string }) => (
    <div className="flex items-center justify-between group">
        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
            {icon}
            <span className="text-sm">{label}</span>
        </div>
        <div className="flex gap-1">
            {keys.map(k => (
                <kbd
                    key={k}
                    className={clsx(
                        "px-1.5 py-0.5 rounded text-[10px] font-sans font-medium min-w-[20px] text-center",
                        theme === 'dark'
                            ? "bg-white/10 border border-white/10 shadow-sm"
                            : "bg-white border border-gray-200 shadow-sm"
                    )}
                >
                    {k}
                </kbd>
            ))}
        </div>
    </div>
);
