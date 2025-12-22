
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useApp } from '../contexts/AppContext';
import type { Review } from '../types';

interface AdminReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminReviewsModal: React.FC<AdminReviewsModalProps> = ({ isOpen, onClose }) => {
    const { deleteReview } = useShoppingList();
    const { showToast } = useApp();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !db) return;

        setIsLoading(true);
        // Busca todas as reviews, da mais recente para a mais antiga
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedReviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Review));
            setReviews(loadedReviews);
            setIsLoading(false);
        }, (error) => {
            // Correção: Adicionado handler de erro
            console.warn("[Admin] Erro ao carregar avaliações:", error.message);
            setIsLoading(false);
            if (error.code === 'permission-denied') {
                showToast("Sem permissão para ver avaliações.");
            }
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleDelete = async (reviewId: string, offerId: string) => {
        if (!window.confirm("Deseja apagar este comentário permanentemente?")) return;
        try {
            await deleteReview(reviewId, offerId);
            showToast("Avaliação removida.");
        } catch (error) {
            console.error(error);
            showToast("Erro ao remover.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-2xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-400">rate_review</span>
                        Moderação de Avaliações
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <span className="material-symbols-outlined animate-spin text-3xl text-gray-400">sync</span>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                            <p>Nenhuma avaliação recebida ainda.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {reviews.map((review) => (
                                <div key={review.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex gap-4">
                                    {/* Product Thumbnail (Snapshot) */}
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-black/30 rounded-lg overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                                        {review.offerImage ? (
                                            <img src={review.offerImage} alt="Prod" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="material-symbols-outlined text-gray-400">image</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-primary dark:text-orange-400 uppercase tracking-wider mb-0.5 line-clamp-1">
                                                    {review.offerName || "Produto Desconhecido"}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex text-blue-500 text-xs gap-0.5">
                                                        {[1,2,3,4,5].map(s => (
                                                            <span key={s} className="material-symbols-outlined text-[14px]">
                                                                {s <= review.rating ? 'check' : 'remove'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-400">• {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Hoje'}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(review.id, review.offerId)}
                                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Apagar avaliação"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 bg-gray-50 dark:bg-black/20 p-2 rounded-lg italic">
                                            "{review.comment}"
                                        </p>

                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200">
                                                {review.userPhotoURL ? <img src={review.userPhotoURL} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-xs">person</span>}
                                            </div>
                                            <span className="text-xs text-gray-500 font-bold">{review.userName}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
