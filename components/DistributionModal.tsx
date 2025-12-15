
import React, { useState, useEffect } from 'react';
import { PWAInstallContent } from './PWAInstallPrompt'; 
import { useApp } from '../contexts/AppContext';

interface DistributionModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleShare: () => Promise<void>;
    installPromptEvent: any;
    isPWAInstallVisible: boolean;
    handleInstall: () => Promise<boolean>;
    handleDismissInstall: () => void;
}

export const DistributionModal: React.FC<DistributionModalProps> = ({ isOpen, onClose, handleShare, installPromptEvent, isPWAInstallVisible, handleInstall, handleDismissInstall }) => {
    const [activeTab, setActiveTab] = useState<'pwa' | 'share'>('pwa');
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveTab('pwa');
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleShareClick = async () => {
        await handleShare();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 pb-0 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Acesso e Distribuição</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                {/* Tabs Navigation */}
                <div className="flex justify-center gap-6 mt-4 border-b border-gray-200 dark:border-gray-700 px-6">
                    <button 
                        onClick={() => setActiveTab('pwa')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'pwa' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Atalho PWA
                    </button>
                    <button 
                        onClick={() => setActiveTab('share')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'share' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Compartilhar App
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'pwa' ? (
                        <PWAInstallContent
                            onInstall={handleInstall}
                            onDismiss={() => { handleDismissInstall(); onClose(); }}
                            installPromptEvent={installPromptEvent}
                            isPWAInstallVisible={isPWAInstallVisible}
                        />
                    ) : (
                        <div className="flex flex-col items-center text-center gap-4">
                             <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-4xl">share</span>
                             </div>
                             <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Espalhe a novidade!</h2>
                             <p className="text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                 Envie o link do Itens na Mão para seus amigos e familiares.
                             </p>
                             <button 
                                onClick={handleShareClick}
                                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg transition-colors hover:bg-primary/90"
                            >
                                <span className="material-symbols-outlined mr-2">ios_share</span>
                                Compartilhar Link
                            </button>
                            <p className="text-xs text-gray-400 mt-2">
                                Se seu dispositivo suportar, o menu de compartilhamento nativo será aberto.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
