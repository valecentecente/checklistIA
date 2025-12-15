
import React, { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
    const { theme, setTheme } = useApp();

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const themes = [
        {
            id: 'light',
            name: 'Claro',
            icon: 'light_mode',
            color: 'bg-orange-100 text-orange-600',
            border: 'border-orange-200'
        },
        {
            id: 'dark',
            name: 'Escuro',
            icon: 'dark_mode',
            color: 'bg-slate-700 text-slate-200',
            border: 'border-slate-600'
        },
        {
            id: 'christmas',
            name: 'Natal',
            icon: 'forest',
            color: 'bg-red-100 text-red-700',
            border: 'border-red-200'
        },
        {
            id: 'newyear',
            name: 'Ano Novo',
            icon: 'celebration',
            color: 'bg-yellow-100 text-yellow-700',
            border: 'border-yellow-200'
        }
    ];

    return (
        <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-xs flex-col overflow-hidden rounded-xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Escolha o Tema</h2>
                    <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full p-1 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => { setTheme(t.id as any); onClose(); }}
                            className={`flex items-center p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                                theme === t.id 
                                ? `border-primary bg-primary/5 dark:bg-primary/20` 
                                : `border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10`
                            }`}
                        >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.color} mr-4`}>
                                <span className="material-symbols-outlined">{t.icon}</span>
                            </div>
                            <span className="font-semibold text-text-primary-light dark:text-text-primary-dark flex-1 text-left">
                                {t.name}
                            </span>
                            {t.id === 'christmas' && (
                                <span className="text-xl animate-bounce mr-2">🎅</span>
                            )}
                            {t.id === 'newyear' && (
                                <span className="text-xl animate-pulse mr-2">🥂</span>
                            )}
                            {theme === t.id && (
                                <span className="material-symbols-outlined text-primary">check_circle</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
