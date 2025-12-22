import React, { useState, useEffect } from 'react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    // Chave PIX atualizada conforme solicitação do usuário
    const pixKey = 'checklistiasp@gmail.com'; 

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(pixKey).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl p-6 animate-slideUp border border-orange-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <span className="material-symbols-outlined !text-4xl text-primary">volunteer_activism</span>
                    </div>
                    
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                        Apoie o Desenvolvedor
                    </h2>
                    
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6 leading-relaxed">
                        Este aplicativo é 100% gratuito e sem anúncios. Se você gosta dele e quer ajudar a manter os servidores ativos, considere pagar um café! ☕
                    </p>

                    <div className="w-full bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-border-light dark:border-border-dark mb-6">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chave PIX</p>
                        <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="material-symbols-outlined text-green-600">payments</span>
                            <span className="flex-1 text-sm font-mono truncate text-gray-700 dark:text-gray-300">{pixKey}</span>
                        </div>
                        <button 
                            onClick={handleCopy}
                            className={`mt-3 w-full h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
                            }`}
                        >
                            {copied ? (
                                <><span className="material-symbols-outlined text-sm">check</span> Copiado!</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">content_copy</span> Copiar Chave</>
                            )}
                        </button>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};