
import React, { useState, useEffect } from 'react';
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
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveTab('pwa');
            // Detecção refinada de iOS
            const iosMatch = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            setIsIOS(iosMatch);
            
            // Verificação de modo standalone
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
            setIsInstalled(isStandalone);
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const onInstallClick = async () => {
        console.log("[DistributionModal] Tentando instalar...", installPromptEvent);
        if (!installPromptEvent) {
            // O sistema não conseguiu disparar o nativo, mostramos as instruções
            return;
        }
        const success = await handleInstall();
        if (success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[220] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-[2rem] bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                <div className="p-5 pb-2 flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">ChecklistIA no Celular</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex justify-center gap-4 mt-2 border-b border-gray-100 dark:border-gray-800 px-6">
                    <button 
                        onClick={() => setActiveTab('pwa')}
                        className={`pb-3 px-2 font-bold text-xs uppercase tracking-widest transition-colors ${activeTab === 'pwa' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        {isInstalled ? 'App Ativo' : (isIOS ? 'Como Instalar' : 'Instalar')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('share')}
                        className={`pb-3 px-2 font-bold text-xs uppercase tracking-widest transition-colors ${activeTab === 'share' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                    >
                        Compartilhar
                    </button>
                </div>

                <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
                    {activeTab === 'pwa' ? (
                        isInstalled ? (
                            <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
                                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-black text-lg text-gray-800 dark:text-white">App Instalado!</h3>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Você já está usando a versão oficial. <br/>Modo offline e performance máxima ativos.
                                    </p>
                                </div>
                                <button onClick={onClose} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">
                                    Continuar Compras
                                </button>
                            </div>
                        ) : isIOS ? (
                            <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
                                <div className="h-16 w-16 bg-white rounded-2xl p-3 shadow-lg border border-gray-100 flex items-center justify-center">
                                    <img src="/icon.svg" alt="App" className="w-full h-full"/>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-black text-lg text-gray-800 dark:text-white leading-tight">Adicione ao seu iPhone</h3>
                                    <div className="flex flex-col gap-4 items-start text-left">
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-full">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">1</div>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Toque no ícone de <span className="text-blue-500 flex inline-flex items-center">compartilhar <span className="material-symbols-outlined text-lg ml-1">ios_share</span></span> no Safari.</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl w-full">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">2</div>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Role para baixo e selecione <br/><span className="text-gray-900 dark:text-white font-black">"Adicionar à Tela de Início"</span>.</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                    Entendi, vou fazer!
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
                                <div className="h-16 w-16 bg-white rounded-2xl p-2 shadow-lg border border-gray-100 flex items-center justify-center">
                                    <img src="/icon.svg" alt="App" className="w-full h-full"/>
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="font-black text-lg text-gray-800 dark:text-white">Instale no seu Android</h3>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                        {installPromptEvent 
                                            ? "Pronto para adicionar! Clique no botão abaixo para criar o atalho." 
                                            : "Não conseguimos iniciar o prompt automático. Siga o passo a passo manual:"}
                                    </p>
                                </div>

                                {!installPromptEvent ? (
                                    <div className="flex flex-col gap-3 items-start text-left w-full">
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl w-full border border-gray-100 dark:border-white/5">
                                            <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">1</div>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Toque nos <span className="font-black text-gray-900 dark:text-white">3 pontinhos (⋮)</span> no topo do Chrome.</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl w-full border border-gray-100 dark:border-white/5">
                                            <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">2</div>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Selecione <span className="font-black text-gray-900 dark:text-white">"Instalar Aplicativo"</span>.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={onInstallClick} 
                                        className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">download_for_offline</span>
                                        Adicionar Atalho
                                    </button>
                                )}

                                <button 
                                    onClick={onClose}
                                    className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
                                >
                                    Já entendi, fechar
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
                             <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                                <span className="material-symbols-outlined text-4xl">share</span>
                             </div>
                             <div className="space-y-2">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Espalhe a novidade!</h2>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Compartilhe o ChecklistIA com seus amigos. <br/>É grátis e ajuda muito na hora da compra.
                                </p>
                             </div>
                             <button 
                                onClick={handleShare}
                                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined mr-2">ios_share</span>
                                Compartilhar Link
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
