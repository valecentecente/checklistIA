
import React from 'react';
import { Logo } from './Logo';

export const AboutContent: React.FC = () => {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-blue-100 text-blue-600 shadow-sm">
               <Logo className="w-10 h-10"/>
            </div>
            {/* REMOVIDO font-display DAQUI */}
            <div className="flex items-baseline justify-center gap-0.5">
                <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Checklist</h2>
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">IA</h2>
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-orange-700 dark:bg-orange-900/60 dark:text-orange-200 font-sans">Beta</span>
            </div>

            <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">Soma, quantidade e pesagem. Simples.</p>

            <div className="mt-4 text-sm text-left text-text-secondary-light dark:text-text-secondary-dark bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                <p className="font-bold text-yellow-800 dark:text-yellow-300 text-center mb-1">Atenção: Versão Beta</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-center text-xs">
                    Este app está em desenvolvimento. Instabilidades podem ocorrer. Agradecemos seu feedback!
                </p>
            </div>

            <p className="mt-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark">
                Versão 2.1.1
            </p>
        </div>
    );
};

export const AboutModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = () => {
    return null;
};
