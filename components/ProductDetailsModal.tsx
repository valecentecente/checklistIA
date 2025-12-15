
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import type { Review } from '../types';

export const ProductDetailsModal: React.FC = () => {
    const { isProductDetailsModalOpen, closeModal, selectedProduct, openModal } = useApp();
    const { addReview, getProductReviews } = useShoppingList();
    const { user } = useAuth();

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
    
    // Rating Form State
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);

    const product = selectedProduct;
    const images = product?.images && product.images.length > 0 ? product.images : (product?.image ? [product.image] : []);

    // Fetch Reviews on open
    useEffect(() => {
        if (isProductDetailsModalOpen && product) {
            document.body.style.overflow = 'hidden';
            setIsLoadingReviews(true);
            getProductReviews(product.id).then(fetchedReviews => {
                setReviews(fetchedReviews);
                setIsLoadingReviews(false);
            });
            // Reset form
            setNewRating(0);
            setNewComment('');
            setReviewSuccess(false);
            setCurrentImageIndex(0);
            setActiveTab('details');
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isProductDetailsModalOpen, product]);

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            openModal('auth');
            return;
        }
        if (newRating === 0) return;

        setIsSubmittingReview(true);
        try {
            if (product) {
                // Passa o nome e imagem do produto para o contexto salvar
                await addReview(product.id, product.name, product.image, newRating, newComment);
                setReviewSuccess(true);
                // Refresh reviews locally
                const newReviewObj: Review = {
                    id: 'temp-' + Date.now(),
                    offerId: product.id,
                    offerName: product.name,
                    offerImage: product.image,
                    userId: user.uid,
                    userName: user.displayName || 'Eu',
                    userPhotoURL: user.photoURL,
                    rating: newRating,
                    comment: newComment,
                    createdAt: new Date()
                };
                setReviews([newReviewObj, ...reviews]);
                setNewRating(0);
                setNewComment('');
                setTimeout(() => setReviewSuccess(false), 3000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (!isProductDetailsModalOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[170] bg-black/80 flex items-end sm:items-center justify-center animate-fadeIn backdrop-blur-sm" onClick={() => closeModal('productDetails')}>
            <div className="bg-white dark:bg-[#121212] w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[95vh] h-[90vh] flex flex-col overflow-hidden animate-slideUp shadow-2xl relative" onClick={e => e.stopPropagation()}>
                
                {/* Close Button (Floating) */}
                <button 
                    onClick={() => closeModal('productDetails')}
                    className="absolute top-4 right-4 z-20 h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* --- CAROUSEL --- */}
                <div className="relative w-full aspect-square bg-white shrink-0">
                    {images.length > 0 ? (
                        <>
                            <img 
                                src={images[currentImageIndex]} 
                                alt={product.name} 
                                className="w-full h-full object-contain p-8 mix-blend-multiply dark:mix-blend-normal transition-opacity duration-300" 
                            />
                            
                            {/* Navigation Arrows (Only if > 1 image) */}
                            {images.length > 1 && (
                                <>
                                    <button onClick={(e) => {e.stopPropagation(); handlePrevImage();}} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100/50 hover:bg-gray-100 text-gray-600 transition-colors">
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button onClick={(e) => {e.stopPropagation(); handleNextImage();}} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100/50 hover:bg-gray-100 text-gray-600 transition-colors">
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </>
                            )}

                            {/* Dots */}
                            {images.length > 1 && (
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                                    {images.map((_, idx) => (
                                        <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-gray-300 w-1.5'}`}></div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="material-symbols-outlined text-6xl">image_not_supported</span>
                        </div>
                    )}
                </div>

                {/* --- CONTENT SCROLLABLE AREA --- */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#1a1a1a] rounded-t-3xl -mt-6 relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="p-6 pb-24"> {/* pb-24 padding for sticky footer */}
                        
                        {/* Title & Price */}
                        <div className="mb-4">
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{product.store}</p>
                                {product.averageRating ? (
                                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                                        <span className="material-symbols-outlined text-sm text-yellow-600 dark:text-yellow-400 font-variation-FILL-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">{product.averageRating.toFixed(1)}</span>
                                        <span className="text-[10px] text-yellow-700 dark:text-yellow-300 opacity-70">({product.reviewCount})</span>
                                    </div>
                                ) : null}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-1 mb-2">
                                {product.name}
                            </h2>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{product.price}</span>
                                {product.oldPrice && (
                                    <span className="text-sm text-gray-400 line-through decoration-red-400">{product.oldPrice}</span>
                                )}
                                {product.discount && (
                                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">
                                        {product.discount}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* --- TABS --- */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                            <button 
                                onClick={() => setActiveTab('details')}
                                className={`flex-1 pb-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Detalhes
                            </button>
                            <button 
                                onClick={() => setActiveTab('reviews')}
                                className={`flex-1 pb-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Avaliações ({reviews.length})
                            </button>
                        </div>

                        {activeTab === 'details' ? (
                            <div className="animate-fadeIn">
                                {/* Description */}
                                <div className="prose dark:prose-invert prose-sm max-w-none text-gray-600 dark:text-gray-300">
                                    {product.description ? (
                                        <p className="whitespace-pre-wrap leading-relaxed">{product.description}</p>
                                    ) : (
                                        <p className="italic opacity-60">Nenhuma descrição detalhada disponível para este produto.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fadeIn flex flex-col gap-6">
                                {/* Rating Summary */}
                                <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="text-center">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white block">
                                            {product.averageRating ? product.averageRating.toFixed(1) : '0.0'}
                                        </span>
                                        <div className="flex text-yellow-400 text-sm">
                                            {[1,2,3,4,5].map(s => (
                                                <span key={s} className="material-symbols-outlined text-sm font-variation-FILL-1" style={{ fontVariationSettings: `'FILL' ${s <= (product.averageRating || 0) ? 1 : 0}` }}>star</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {reviews.length === 0 ? "Seja o primeiro a avaliar!" : `${reviews.length} opiniões de clientes`}
                                        </p>
                                    </div>
                                </div>

                                {/* Review List */}
                                <div className="flex flex-col gap-4">
                                    {isLoadingReviews ? (
                                        <p className="text-center text-gray-500 text-sm py-4">Carregando avaliações...</p>
                                    ) : reviews.length > 0 ? (
                                        reviews.map((review) => (
                                            <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                            {review.userPhotoURL ? <img src={review.userPhotoURL} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-gray-400 text-sm">person</span>}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{review.userName}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Hoje'}</span>
                                                </div>
                                                <div className="flex text-yellow-400 text-xs mb-1">
                                                    {[1,2,3,4,5].map(s => (
                                                        <span key={s} className={`material-symbols-outlined text-[14px] ${s <= review.rating ? 'font-variation-FILL-1' : ''}`} style={s <= review.rating ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                                                    ))}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">{review.comment}</p>
                                            </div>
                                        ))
                                    ) : null}
                                </div>

                                {/* Add Review Form */}
                                {!reviewSuccess ? (
                                    <form onSubmit={handleSubmitReview} className="mt-4 bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <h4 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Avaliar este produto</h4>
                                        <div className="flex gap-2 mb-3">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setNewRating(star)}
                                                    className="focus:outline-none transition-transform active:scale-90"
                                                >
                                                    <span className={`material-symbols-outlined text-2xl ${(hoverRating || newRating) >= star ? 'text-yellow-400 font-variation-FILL-1' : 'text-gray-300'}`} style={(hoverRating || newRating) >= star ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                                        star
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary resize-none mb-3 dark:text-white"
                                            rows={3}
                                            placeholder="Escreva sua opinião..."
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            required
                                        ></textarea>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmittingReview || newRating === 0}
                                            className="w-full bg-gray-800 dark:bg-white text-white dark:text-black font-bold py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                                        >
                                            {isSubmittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-center text-sm font-bold border border-green-100 dark:border-green-800">
                                        Obrigado pela sua avaliação!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- STICKY FOOTER ACTION --- */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-gray-800 z-20">
                    <a 
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-base shadow-lg transition-transform active:scale-95 gap-2"
                    >
                        <span>Ver na Loja</span>
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
