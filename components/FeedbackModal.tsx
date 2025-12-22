import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Internal component for the celebration effect
const SupportThankYouEffect = () => (
    <>
        <style>{`
            @keyframes floatUpHeart {
                0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translate(calc(-50% + var(--tx)), var(--ty)) rotate(var(--r)) scale(1.2); opacity: 0; }
            }
            .heart-particle {
                position: absolute;
                bottom: 60px; /* Start near the button */
                left: 50%;
                font-size: 24px;
                animation: floatUpHeart 1.5s ease-out forwards;
                pointer-events: none;
                z-index: 60;
            }
        `}</style>
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none rounded-2xl overflow-hidden">
            {/* Floating Hearts */}
            {[...Array(20)].map((_, i) => {
                const tx = (Math.random() - 0.5) * 300 + 'px'; // Spread X
                const ty = -(150 + Math.random() * 300) + 'px'; // Spread Y (upwards)
                const r = (Math.random() - 0.5) * 60 + 'deg'; // Rotation
                const delay = Math.random() * 0.4 + 's';
                const icon = ['❤️', '🧡', '💛', '💖', '☕', '✨'][Math.floor(Math.random() * 6)];
                
                return (
                    <div 
                        key={i} 
                        className="heart-particle" 
                        style={{ '--tx': tx, '--ty': ty, '--r': r, animationDelay: delay } as React.CSSProperties}
                    >
                        {icon}
                    </div>
                );
            })}
            
            {/* Thank You Message Card */}
            <div className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-2xl p-8 rounded-3xl border-4 border-orange-100 dark:border-orange-900/50 flex flex-col items-center animate-bounce-y text-center transform scale-110 z-50 pointer-events-auto">
                <span className="text-6xl mb-4 animate-pulse">🥰</span>
                <h3 className="text-3xl font-black text-orange-600 dark:text-orange-400 mb-2">Obrigado!</h3>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Sua ajuda é incrível.</p>
            </div>
        </div>
    </>
);

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { showToast } = useApp();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'rate' | 'support'>('rate');
    
    // Rating States
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Support States
    const [copied, setCopied] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    // Chave PIX atualizada conforme solicitação do usuário
    const pixKey = 'checklistiasp@gmail.com'; 

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setRating(0);
            setComment('');
            setCopied(false);
            setShowThankYou(false);
            setActiveTab('rate'); // Default tab
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            showToast("Por favor, selecione uma nota.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (db) {
                await addDoc(collection(db, 'feedbacks'), {
                    rating,
                    comment,
                    userId: user?.uid || 'anonymous',
                    userName: user?.displayName || 'Anônimo',
                    createdAt: serverTimestamp(),
                    platform: 'web'
                });
                showToast("Obrigado pelo seu feedback!");
            } else {
                showToast("Obrigado! (Modo Offline)");
            }
            setRating(0);
            setComment('');
            onClose();
        } catch (error) {
            console.error("Erro ao enviar feedback:", error);
            showToast("Erro ao enviar. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixKey).then(() => {
            setCopied(true);
            setShowThankYou(true);
            // Timer to reset effects
            setTimeout(() => {
                setCopied(false);
                setShowThankYou(false);
            }, 3000);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {showThankYou && <SupportThankYouEffect />}

                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-orange-600 p-6 pb-8 text-white text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <h2 className="text-2xl font-bold mb-1">Avaliar & Apoiar</h2>
                    <p className="text-white/90 text-xs opacity-90">Sua opinião e apoio mantêm o app vivo!</p>
                </div>

                {/* Tab Navigation (Segmented Control) */}
                <div className="px-6 -mt-6 relative z-10">
                    <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => setActiveTab('rate')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'rate' 
                                ? 'bg-primary text-white shadow-md' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-lg">star</span>
                            Avaliar
                        </button>
                        <button 
                            onClick={() => setActiveTab('support')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'support' 
                                ? 'bg-primary text-white shadow-md' 
                                : 'animate-pulse text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-lg ${activeTab === 'support' ? '' : 'text-yellow-500 dark:text-yellow-400'}`}>volunteer_activism</span>
                            Apoiar
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-4 min-h-[300px]">
                    {activeTab === 'rate' ? (
                        /* SECTION 1: FEEDBACK FORM */
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-fadeIn">
                            <div className="flex flex-col items-center gap-3 mt-2">
                                <p className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide">O que você está achando?</p>
                                <div className="flex gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                        >
                                            <span className={`material-symbols-outlined !text-4xl ${(hoverRating || rating) >= star ? 'text-yellow-400 font-variation-FILL-1' : 'text-gray-300 dark:text-gray-600'}`} style={ (hoverRating || rating) >= star ? { fontVariationSettings: "'FILL' 1" } : {} }>
                                                star
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 p-4 text-sm focus:ring-primary focus:border-primary dark:text-white resize-none h-28"
                                placeholder="Escreva um comentário (opcional)..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            ></textarea>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 w-full rounded-xl bg-gray-800 dark:bg-white text-white dark:text-gray-900 font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-70 text-base mt-auto"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                            </button>
                        </form>
                    ) : (
                        /* SECTION 2: DONATION / SUPPORT */
                        <div className="flex flex-col gap-6 animate-fadeIn">
                             <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-5 border border-orange-100 dark:border-orange-500/20 text-center mt-2">
                                <div className="flex justify-center mb-3">
                                    <div className="h-12 w-12 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-orange-500 text-2xl">local_cafe</span>
                                    </div>
                                </div>
                                <p className="text-sm text-text-primary-light dark:text-text-primary-dark font-medium leading-relaxed">
                                    Este app é 100% grátis e sem anúncios. Se ele te ajuda, considere pagar um café para o desenvolvedor! ☕
                                </p>
                            </div>
                            
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Chave PIX (E-mail)</p>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
                                    <span className="material-symbols-outlined text-green-600">payments</span>
                                    <span className="flex-1 text-sm font-mono truncate text-gray-700 dark:text-gray-300 select-all">{pixKey}</span>
                                </div>

                                <button 
                                    onClick={handleCopyPix}
                                    className={`w-full h-12 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2 shadow-md relative overflow-hidden group ${
                                        copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary/90'
                                    }`}
                                >
                                    {copied ? (
                                        <><span className="material-symbols-outlined">check</span> Copiado!</>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined group-hover:animate-bounce">content_copy</span> 
                                            Copiar Chave
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};