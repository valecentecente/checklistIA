import React, { useState } from 'react';

const InstagramIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <rect x="4" y="4" width="16" height="16" rx="4"></rect>
       <circle cx="12" cy="12" r="3"></circle>
       <line x1="16.5" y1="7.5" x2="16.5" y2="7.501"></line>
    </svg>
);

const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"></path>
    </svg>
);

const TikTokIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <path d="M9 12a4 4 0 1 0 4 4v-12a5 5 0 0 0 5 5"></path>
    </svg>
);

const YouTubeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <rect x="3" y="5" width="18" height="14" rx="4"></rect>
       <path d="M10 9l5 3l-5 3z"></path>
    </svg>
);

const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export const ContactContent: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const email = 'checklistiasp@gmail.com';

    const handleCopy = () => {
        navigator.clipboard.writeText(email).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary mb-2">
                <span className="material-symbols-outlined !text-3xl">contact_support</span>
            </div>

            <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center leading-tight">Entre em Contato</h2>
            <p className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark text-center leading-snug max-w-[90%]">
                Adoramos ouvir suas ideias! Fale conosco por um dos canais abaixo.
            </p>

            <div className="mt-5 w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark mb-1 ml-1">NOSSO E-MAIL</p>
                <div className="rounded-lg bg-background-light dark:bg-background-dark p-2.5 border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="material-symbols-outlined text-primary text-xl">mail</span>
                       <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark select-all">{email}</span>
                    </div>
                    <button 
                        onClick={handleCopy}
                        className={`w-full text-xs font-bold py-2 px-3 rounded-md transition-colors uppercase tracking-wide shadow-sm ${
                            copied 
                            ? 'bg-green-600 text-white' 
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                    >
                        {copied ? 'Copiado!' : 'Copiar E-mail'}
                    </button>
                </div>
            </div>

            <div className="mt-5 w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark mb-2 text-center">REDES SOCIAIS</p>
                <div className="flex justify-center gap-3 flex-wrap">
                    <a href="https://www.instagram.com/checklistiaof/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="Instagram">
                        <InstagramIcon className="w-6 h-6 text-pink-600" />
                    </a>
                    <a href="https://www.facebook.com/checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="Facebook">
                        <FacebookIcon className="w-6 h-6 text-blue-600" />
                    </a>
                    <a href="https://www.tiktok.com/@checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="TikTok">
                        <TikTokIcon className="w-6 h-6 text-slate-800 dark:text-white" />
                    </a>
                    <a href="https://www.youtube.com/@checklistiaof" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="YouTube">
                        <YouTubeIcon className="w-6 h-6 text-red-600" />
                    </a>
                    <a href="https://x.com/checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="X (Twitter)">
                        <XIcon className="w-5 h-5 text-slate-900 dark:text-white" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export const ContactModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = () => {
    return null;
};