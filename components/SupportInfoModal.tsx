
import React, { useState, useEffect } from 'react';
import { AboutContent } from './AboutModal';
import { ContactContent } from './ContactModal';

interface SupportInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportInfoModal: React.FC<SupportInfoModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'about' | 'contact'>('about');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveTab('about');
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 pb-0 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Informações e Suporte</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                {/* Tabs Navigation */}
                <div className="flex justify-center gap-6 mt-4 border-b border-gray-200 dark:border-gray-700 px-6">
                    <button 
                        onClick={() => setActiveTab('about')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'about' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Sobre o App
                    </button>
                    <button 
                        onClick={() => setActiveTab('contact')}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'contact' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Fale Conosco
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'about' ? <AboutContent /> : <ContactContent />}
                </div>
            </div>
        </div>
    );
};
