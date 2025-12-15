import React, { useState } from 'react';

interface PWAInstallContentProps {
    onInstall: () => Promise<boolean>;
    onDismiss: () => void;
    installPromptEvent: any;
    isPWAInstallVisible: boolean;
}

export const PWAInstallContent: React.FC<PWAInstallContentProps> = ({ onInstall, onDismiss, installPromptEvent, isPWAInstallVisible }) => {
    const [isInstalled, setIsInstalled] = useState(false);

    const handleInstallClick = async () => {
        const success = await onInstall();
        if (success) {
            setIsInstalled(true);
            setTimeout(() => {
                onDismiss();
            }, 4000); 
        }
    };

    // Se já instalado, mostra sucesso
    if (isInstalled) {
         return (
            <div className="flex flex-col items-center text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                   <span className="material-symbols-outlined !text-4xl">download_done</span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Instalado!</h2>
                <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
                    O app foi adicionado à sua tela inicial. Abra por lá para um acesso mais rápido.
                </p>
            </div>
         );
    }
    
    // Se o prompt não está disponível (evento nulo), assume que já está instalado ou não suportado
    if (!installPromptEvent) {
         return (
            <div className="text-center py-4">
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4">smartphone</span>
                <p className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-2">Atalho já na tela!</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mx-auto">
                    O PWA já está instalado ou seu dispositivo/navegador não suporta a instalação automática.
                </p>
                <div className="mt-6">
                    <button 
                        onClick={onDismiss}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
         );
    }

    return (
        <div className="flex flex-col items-center text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white p-2 border border-blue-100 shadow-sm">
               <img src="/icon.svg" alt="Ícone do App ChecklistIA" className="w-full h-full"/>
            </div>
            <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Adicionar à Tela Inicial?</h2>
            <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
                Crie um ícone/atalho para acesso rápido e modo offline.
            </p>
            <div className="mt-6 flex flex-col gap-3 w-full">
                 <button 
                    onClick={handleInstallClick}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-primary/90"
                >
                    Adicionar Atalho
                </button>
                 <button 
                    onClick={onDismiss}
                    className="flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-bold text-text-secondary-light dark:text-text-secondary-dark transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                >
                    Agora não
                </button>
            </div>
        </div>
    );
};

export const PWAInstallPrompt: React.FC<{ onInstall: () => Promise<boolean>; onDismiss: () => void; }> = ({ onInstall, onDismiss }) => {
    return null; 
};