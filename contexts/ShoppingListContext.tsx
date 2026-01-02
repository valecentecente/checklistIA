
import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode, useMemo } from 'react';
import { 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    writeBatch, 
    serverTimestamp, 
    getDoc,
    getDocs,
    where,
    setDoc,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type { ShoppingItem, PurchaseRecord, HistoricItem, ReceivedListRecord, AuthorMetadata, FullRecipe, Offer, Review, User, ActivityLog } from '../types';

interface ShoppingListContextType {
    items: ShoppingItem[];
    history: PurchaseRecord[];
    receivedHistory: ReceivedListRecord[];
    favorites: FullRecipe[];
    offers: Offer[];
    savedOffers: Offer[]; 
    arcadeStats: Record<string, number>;
    formatCurrency: (value: number) => string;
    addItem: (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'creatorUid' | 'creatorDisplayName' | 'creatorPhotoURL' | 'listId' | 'responsibleUid' | 'responsibleDisplayName'>) => Promise<void>;
    addIngredientsBatch: (items: any[]) => Promise<void>;
    deleteItem: (id: string) => void;
    updateItem: (item: ShoppingItem) => Promise<void>;
    deleteRecipeGroup: (recipeName: string) => void;
    toggleItemPurchased: (id: string) => void;
    savePurchase: (marketName: string) => Promise<void>;
    deleteHistoryRecord: (id: string) => Promise<void>;
    finishWithoutSaving: () => Promise<void>;
    addHistoricItem: (item: HistoricItem, marketName?: string) => Promise<void>;
    repeatPurchase: (purchase: PurchaseRecord) => Promise<{ message: string }>;
    findDuplicate: (name: string, currentItems: ShoppingItem[]) => ShoppingItem | undefined;
    importSharedList: (shareId: string) => Promise<{ marketName: string; items: any[]; author?: any } | null>;
    saveReceivedListToHistory: (data: any) => Promise<void>;
    getItemHistory: (itemName: string) => { price: number; date: string; marketName: string; details: string }[];
    searchUser: (identifier: string) => Promise<AuthorMetadata | null>;
    shareListWithEmail: (purchase: PurchaseRecord, identifier: string) => Promise<{ success: boolean; type: 'direct' | 'link'; shareUrl?: string; recipientName?: string }>;
    shareListWithPartner: (identifier: string, listToShareId: string) => Promise<{ success: boolean; message: string; inviteId?: string }>;
    markReceivedListAsRead: (id: string) => Promise<void>;
    unreadReceivedCount: number;
    toggleFavorite: (recipe: FullRecipe) => Promise<{ success: boolean; action: 'added' | 'removed' }>;
    isFavorite: (recipeName: string) => boolean;
    toggleOfferSaved: (offer: Offer) => Promise<void>; 
    isOfferSaved: (offerId: string) => boolean; 
    addReview: (offerId: string, offerName: string, offerImage: string, rating: number, comment: string) => Promise<void>;
    deleteReview: (reviewId: string, offerId: string) => Promise<void>;
    getProductReviews: (offerId: string) => Promise<Review[]>;
    logAdminAction: (actionType: 'create' | 'update' | 'delete' | 'login', targetName: string, details?: string) => Promise<void>;
    getTeamMembers: () => Promise<User[]>;
    getMemberLogs: (userId: string) => Promise<ActivityLog[]>;
    updateArcadeStat: (gameId: string, score: number) => Promise<boolean>;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

const ignorePermissionError = (err: any) => {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        return true;
    }
    return false;
};

const sanitizeForFirestore = (obj: any) => {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            sanitized[key] = obj[key];
        }
    });
    return sanitized;
};

export const ShoppingListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [history, setHistory] = useState<PurchaseRecord[]>([]);
    const [receivedHistory, setReceivedHistory] = useState<ReceivedListRecord[]>([]);
    const [favorites, setFavorites] = useState<FullRecipe[]>([]);
    const [savedOffers, setSavedOffers] = useState<Offer[]>([]); 
    const [offers, setOffers] = useState<Offer[]>([]);
    const [arcadeStats, setArcadeStats] = useState<Record<string, number>>({});

    const STORAGE_KEY = 'guestShoppingList';
    const HISTORY_STORAGE_KEY = 'guestShoppingHistory';
    const ARCADE_STORAGE_KEY = 'guestArcadeStats';

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const unreadReceivedCount = useMemo(() => {
        return receivedHistory.filter(r => !r.read).length;
    }, [receivedHistory]);

    const markReceivedListAsRead = useCallback(async (id: string) => {
        if (!user || !db || user.uid.startsWith('offline-user-')) return;
        try {
            await updateDoc(doc(db, `users/${user.uid}/received_lists`, id), {
                read: true
            });
        } catch (error) {
            if (!ignorePermissionError(error)) console.error("Error marking list as read:", error);
        }
    }, [user]);

    useEffect(() => {
        if (!db) return;
        const qOffers = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
        const unsubscribeOffers = onSnapshot(qOffers, (snapshot) => {
            const loadedOffers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Offer));
            setOffers(loadedOffers);
        }, (error) => {
            if (!ignorePermissionError(error)) {
                console.warn("[Firestore] Erro ofertas:", error.message);
            }
        });
        return () => unsubscribeOffers();
    }, []);

    useEffect(() => {
        if (!user || user.uid.startsWith('offline-user-')) {
            const storedList = localStorage.getItem(STORAGE_KEY);
            if (storedList) {
                try { setItems(JSON.parse(storedList)); } catch (e) { setItems([]); }
            } else { setItems([]); }

            const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (storedHistory) {
                try { setHistory(JSON.parse(storedHistory)); } catch (e) { setHistory([]); }
            } else { setHistory([]); }

            const storedArcade = localStorage.getItem(ARCADE_STORAGE_KEY);
            if (storedArcade) {
                try { setArcadeStats(JSON.parse(storedArcade)); } catch (e) { setArcadeStats({}); }
            } else { setArcadeStats({}); }

            setReceivedHistory([]);
            setFavorites([]);
            setSavedOffers([]); 
            return;
        }

        if (!db) return;

        const listId = user.activeListId || user.uid;

        const itemsRef = collection(db, `users/${listId}/items`);
        const unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
            const loadedItems: ShoppingItem[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ShoppingItem));
            setItems(loadedItems);
        }, (error) => {
             if (!ignorePermissionError(error)) {
                 console.warn("[Firestore] Erro itens:", error.message);
             }
        });

        const historyRef = collection(db, `users/${listId}/history`);
        const qHistory = query(historyRef, orderBy('date', 'desc'));
        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const loadedHistory: PurchaseRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PurchaseRecord));
            setHistory(loadedHistory);
        }, (error) => {
             if (!ignorePermissionError(error)) {
                 console.warn("[Firestore] Erro histórico:", error.message);
             }
        });

        const receivedRef = collection(db, `users/${user.uid}/received_lists`);
        const qReceived = query(receivedRef, orderBy('date', 'desc'));
        const unsubscribeReceived = onSnapshot(qReceived, (snapshot) => {
            const loadedReceived: ReceivedListRecord[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    read: data.read || false,
                    ...data
                } as ReceivedListRecord;
            });
            setReceivedHistory(loadedReceived);
        }, (error) => {
             if (!ignorePermissionError(error)) {
                 console.warn("[Firestore] Erro recebidos:", error.message);
             }
        });

        const favoritesRef = collection(db, `users/${user.uid}/favorites`);
        const qFavorites = query(favoritesRef, orderBy('savedAt', 'desc'));
        const unsubscribeFavorites = onSnapshot(qFavorites, (snapshot) => {
            const loadedFavorites: FullRecipe[] = snapshot.docs.map(doc => doc.data() as FullRecipe);
            setFavorites(loadedFavorites);
        }, (error) => {
             if (!ignorePermissionError(error)) {
                 console.warn("[Firestore] Erro favoritos:", error.message);
             }
        });

        const savedOffersRef = collection(db, `users/${user.uid}/saved_offers`);
        const qSavedOffers = query(savedOffersRef, orderBy('savedAt', 'desc'));
        const unsubscribeSavedOffers = onSnapshot(qSavedOffers, (snapshot) => {
            const loadedSaved: Offer[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as Offer;
            });
            setSavedOffers(loadedSaved);
        }, (error) => {
             if (!ignorePermissionError(error)) {
                 console.warn("[Firestore] Erro ofertas salvas:", error.message);
             }
        });

        return () => {
            unsubscribeItems();
            unsubscribeHistory();
            unsubscribeReceived();
            unsubscribeFavorites();
            unsubscribeSavedOffers();
        };
    }, [user]);

    useEffect(() => {
        if (!user || user.uid.startsWith('offline-user-')) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
            localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(arcadeStats));
        }
    }, [items, history, arcadeStats, user]);

    const addItem = async (item: any) => {
        const numericPrice = parseFloat(String(item.calculatedPrice)) || 0;
        const isPurchased = item.isPurchased ?? (numericPrice > 0);
        
        if (!user || user.uid.startsWith('offline-user-')) {
            const newItem = {
                id: Date.now().toString(),
                isPurchased: isPurchased,
                displayPrice: formatCurrency(numericPrice),
                ...item,
                calculatedPrice: numericPrice
            };
            setItems([...items, newItem]);
            return;
        }
        const listId = user.activeListId || user.uid;
        await addDoc(collection(db!, `users/${listId}/items`), {
            ...item,
            calculatedPrice: numericPrice,
            isPurchased: isPurchased,
            displayPrice: formatCurrency(numericPrice),
            creatorUid: user.uid,
            creatorDisplayName: user.displayName,
            creatorPhotoURL: user.photoURL,
            createdAt: serverTimestamp()
        });
    };

    const addIngredientsBatch = async (newItems: any[]) => {
        if (!user || user.uid.startsWith('offline-user-')) {
            const added = newItems.map((item, idx) => {
                const numericPrice = parseFloat(String(item.calculatedPrice)) || 0;
                return {
                    id: (Date.now() + idx).toString(),
                    isPurchased: item.isPurchased ?? (numericPrice > 0),
                    displayPrice: formatCurrency(numericPrice),
                    ...item,
                    calculatedPrice: numericPrice
                };
            });
            setItems([...items, ...added]);
            return;
        }
        const listId = user.activeListId || user.uid;
        const batch = writeBatch(db!);
        newItems.forEach(item => {
            const ref = doc(collection(db!, `users/${listId}/items`));
            const numericPrice = parseFloat(String(item.calculatedPrice)) || 0;
            batch.set(ref, {
                ...item,
                calculatedPrice: numericPrice,
                isPurchased: item.isPurchased ?? (numericPrice > 0),
                displayPrice: formatCurrency(numericPrice),
                creatorUid: user.uid,
                creatorDisplayName: user.displayName,
                creatorPhotoURL: user.photoURL,
                createdAt: serverTimestamp()
            });
        });
        await batch.commit();
    };

    const deleteItem = async (id: string) => {
        if (!user || user.uid.startsWith('offline-user-')) {
            setItems(items.filter(i => i.id !== id));
            return;
        }
        const listId = user.activeListId || user.uid;
        await deleteDoc(doc(db!, `users/${listId}/items`, id));
    };

    const updateItem = async (item: ShoppingItem) => {
        const numericPrice = parseFloat(String(item.calculatedPrice)) || 0;
        const updated = {
            ...item,
            calculatedPrice: numericPrice,
            displayPrice: formatCurrency(numericPrice)
        };
        if (!user || user.uid.startsWith('offline-user-')) {
            setItems(items.map(i => i.id === item.id ? updated : i));
            return;
        }
        const listId = user.activeListId || user.uid;
        const { id, ...rest } = updated;
        await updateDoc(doc(db!, `users/${listId}/items`, id), rest);
    };

    const deleteRecipeGroup = async (recipeName: string) => {
        const toDelete = items.filter(i => i.recipeName === recipeName);
        if (!user || user.uid.startsWith('offline-user-')) {
            setItems(items.filter(i => i.recipeName !== recipeName));
            return;
        }
        const listId = user.activeListId || user.uid;
        const batch = writeBatch(db!);
        toDelete.forEach(item => {
            batch.delete(doc(db!, `users/${listId}/items`, item.id));
        });
        await batch.commit();
    };

    const toggleItemPurchased = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const newState = !item.isPurchased;
        if (!user || user.uid.startsWith('offline-user-')) {
            setItems(items.map(i => i.id === id ? { ...i, isPurchased: newState } : i));
            return;
        }
        const listId = user.activeListId || user.uid;
        await updateDoc(doc(db!, `users/${listId}/items`, id), { isPurchased: newState });
    };

    const savePurchase = async (marketName: string) => {
        const purchasedItems = items.filter(i => i.isPurchased);
        if (purchasedItems.length === 0) return;

        const total = purchasedItems.reduce((acc, i) => acc + (parseFloat(String(i.calculatedPrice)) || 0), 0);
        const record: Omit<PurchaseRecord, 'id'> = {
            date: new Date().toISOString(),
            marketName,
            total,
            items: purchasedItems.map(i => ({
                name: i.name,
                displayPrice: i.displayPrice,
                calculatedPrice: parseFloat(String(i.calculatedPrice)) || 0,
                details: i.details
            }))
        };

        if (!user || user.uid.startsWith('offline-user-')) {
            setHistory([{ id: Date.now().toString(), ...record }, ...history]);
            setItems([]);
            return;
        }

        const listId = user.activeListId || user.uid;
        const batch = writeBatch(db!);
        const historyRef = doc(collection(db!, `users/${listId}/history`));
        batch.set(historyRef, record);

        // LIMPEZA TOTAL: Deleta absolutamente todos os itens associados à lista ativa
        items.forEach(i => {
            batch.delete(doc(db!, `users/${listId}/items`, i.id));
        });

        await batch.commit();
        setItems([]); // Limpa localmente imediatamente
    };

    const deleteHistoryRecord = async (id: string) => {
        if (!user || user.uid.startsWith('offline-user-')) {
            setHistory(history.filter(h => h.id !== id));
            return;
        }
        const listId = user.activeListId || user.uid;
        await deleteDoc(doc(db!, `users/${listId}/history`, id));
    };

    const finishWithoutSaving = async () => {
        if (!user || user.uid.startsWith('offline-user-')) {
            setItems([]);
            return;
        }
        const listId = user.activeListId || user.uid;
        const batch = writeBatch(db!);
        
        // Remove todos os itens da lista ativa atual do Firestore
        items.forEach(i => {
            batch.delete(doc(db!, `users/${listId}/items`, i.id));
        });
        
        await batch.commit();
        setItems([]); // Limpa estado local imediatamente
    };

    const addHistoricItem = async (item: HistoricItem, marketName?: string) => {
        // CORREÇÃO: Força o preço a ser 0 e coloca no grupo de histórico
        await addItem({
            name: item.name,
            calculatedPrice: 0,
            details: item.details,
            isPurchased: false,
            recipeName: marketName ? `Histórico: ${marketName}` : undefined
        });
    };

    const repeatPurchase = async (purchase: PurchaseRecord) => {
        // CORREÇÃO: Define um recipeName especial para criar uma aba separada de histórico
        const groupName = `Histórico: ${purchase.marketName || 'Compra Sem Nome'}`;
        const itemsToRepeat = purchase.items.map(i => {
            return {
                name: i.name,
                calculatedPrice: 0,
                details: i.details,
                isPurchased: false,
                recipeName: groupName
            };
        });
        await addIngredientsBatch(itemsToRepeat);
        return { message: "Itens adicionados em uma nova aba de histórico!" };
    };

    const findDuplicate = (name: string, currentItems: ShoppingItem[]) => {
        const cleanName = name.trim().toLowerCase();
        return currentItems.find(i => i.name.trim().toLowerCase() === cleanName);
    };

    const importSharedList = async (shareId: string) => {
        if (!db) return null;
        try {
            const snap = await getDoc(doc(db, 'shared_lists', shareId));
            if (snap.exists()) {
                return snap.data() as { marketName: string; items: any[]; author?: any };
            }
        } catch (e) {
            if (!ignorePermissionError(e)) console.warn("Erro ao importar lista:", e);
        }
        return null;
    };

    const saveReceivedListToHistory = async (data: any) => {
        if (!user || !db || user.uid.startsWith('offline-user-')) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/received_lists`), {
                ...data,
                date: new Date().toISOString(),
                read: false,
                itemCount: data.items?.length || 0
            });
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
        }
    };

    const getItemHistory = (itemName: string) => {
        const cleanName = itemName.trim().toLowerCase();
        const results: { price: number; date: string; marketName: string; details: string }[] = [];
        
        history.forEach(p => {
            const match = p.items.find(i => i.name.trim().toLowerCase() === cleanName);
            if (match) {
                results.push({
                    price: parseFloat(String(match.calculatedPrice)) || 0,
                    date: p.date,
                    marketName: p.marketName,
                    details: match.details
                });
            }
        });
        
        return results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const searchUser = async (identifier: string): Promise<AuthorMetadata | null> => {
        if (!db) return null;
        const cleanId = identifier.trim().toLowerCase();
        
        try {
            let q;
            if (cleanId.includes('@')) {
                q = query(collection(db, 'users_public'), where('email', '==', cleanId), limit(1));
            } else {
                const username = cleanId.startsWith('@') ? cleanId.slice(1) : cleanId;
                q = query(collection(db, 'users_public'), where('username', '==', username), limit(1));
            }

            const snap = await getDocs(q);
            if (!snap.empty) {
                return snap.docs[0].data() as AuthorMetadata;
            }
        } catch (e) {
            if (!ignorePermissionError(e)) console.warn("Erro ao buscar usuário:", e);
        }
        return null;
    };

    const shareListWithEmail = async (purchase: PurchaseRecord, identifier: string) => {
        if (!user || !db) return { success: false, type: 'link' as const };
        const recipient = await searchUser(identifier);
        
        try {
            const shareRef = await addDoc(collection(db, 'shared_lists'), {
                marketName: purchase.marketName,
                items: purchase.items,
                author: {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    username: user.username
                },
                createdAt: serverTimestamp()
            });

            if (recipient) {
                await addDoc(collection(db, `users/${recipient.uid}/received_lists`), {
                    shareId: shareRef.id,
                    marketName: purchase.marketName,
                    itemCount: purchase.items.length,
                    author: {
                        uid: user.uid,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        username: user.username
                    },
                    date: new Date().toISOString(),
                    read: false,
                    items: purchase.items
                });
                return { success: true, type: 'direct' as const, recipientName: recipient.displayName };
            }

            return { success: true, type: 'link' as const, shareUrl: `${window.location.origin}/?share_id=${shareRef.id}` };
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
            return { success: false, type: 'link' as const };
        }
    };

    const shareListWithPartner = async (identifier: string, listId: string) => {
        if (!user || !db) return { success: false, message: "Erro de conexão." };
        const partner = await searchUser(identifier);
        if (!partner) return { success: false, message: "Parceiro não encontrado." };

        try {
            await addDoc(collection(db, 'list_invites'), {
                fromUid: user.uid,
                fromName: user.displayName,
                toUid: partner.uid,
                listId: listId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            return { success: true, message: `Convite enviado para ${partner.displayName}!` };
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
            return { success: false, message: "Falha de permissão ao convidar." };
        }
    };

    const toggleFavorite = async (recipe: FullRecipe): Promise<{ success: boolean; action: 'added' | 'removed' }> => {
        if (!user || !db || user.uid.startsWith('offline-user-')) return { success: false, action: 'removed' };
        
        const recipeId = recipe.name.toLowerCase().trim().replace(/\s+/g, '-');
        const favRef = doc(db, `users/${user.uid}/favorites`, recipeId);
        
        try {
            const snap = await getDoc(favRef);
            if (snap.exists()) {
                await deleteDoc(favRef);
                return { success: true, action: 'removed' };
            } else {
                const sanitizedRecipe = sanitizeForFirestore(recipe);
                await setDoc(favRef, {
                    ...sanitizedRecipe,
                    savedAt: serverTimestamp()
                });
                return { success: true, action: 'added' };
            }
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
            return { success: false, action: 'removed' };
        }
    };

    const isFavorite = (name: string) => {
        if (!name) return false;
        const cleanName = name.toLowerCase().trim();
        return favorites.some(f => f.name.toLowerCase().trim() === cleanName);
    };

    const toggleOfferSaved = async (offer: Offer) => {
        if (!user || !db) return;
        const ref = doc(db, `users/${user.uid}/saved_offers`, offer.id);
        try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
                await deleteDoc(ref);
            } else {
                await setDoc(ref, {
                    ...offer,
                    savedAt: serverTimestamp()
                });
            }
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
        }
    };

    const isOfferSaved = (id: string) => {
        return savedOffers.some(o => o.id === id);
    };

    const addReview = async (offerId: string, offerName: string, offerImage: string, rating: number, comment: string) => {
        if (!user || !db) return;
        try {
            const reviewData = {
                offerId, offerName, offerImage,
                userId: user.uid,
                userName: user.displayName,
                userPhotoURL: user.photoURL,
                rating, comment,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'reviews'), reviewData);
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
        }
    };

    const deleteReview = async (reviewId: string, offerId: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'reviews', reviewId));
        } catch (e) {
            if (!ignorePermissionError(e)) console.error(e);
        }
    };

    const getProductReviews = async (offerId: string) => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'reviews'), where('offerId', '==', offerId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
        } catch (e) {
            if (!ignorePermissionError(e)) console.warn("Erro ao buscar reviews:", e);
            return [];
        }
    };

    const logAdminAction = async (actionType: any, targetName: string, details?: string) => {
        if (!user || !db) return;
        try {
            await addDoc(collection(db, 'admin_logs'), {
                userId: user.uid,
                userName: user.displayName,
                userPhoto: user.photoURL,
                actionType, targetName, details,
                timestamp: serverTimestamp()
            });
        } catch (e) {
        }
    };

    const getTeamMembers = async () => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['admin_l1', 'admin_l2']));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
        } catch (e) {
            return [];
        }
    };

    const getMemberLogs = async (userId: string) => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'admin_logs'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
        } catch (e) {
            return [];
        }
    };

    const updateArcadeStat = async (gameId: string, score: number): Promise<boolean> => {
        const currentBest = arcadeStats[gameId] || (gameId === 'memory' || gameId === 'slide' ? Infinity : 0);
        let isRecord = false;
        
        if (gameId === 'memory' || gameId === 'slide') {
            if (score < currentBest) isRecord = true;
        } else {
            if (score > currentBest) isRecord = true;
        }

        if (isRecord) {
            setArcadeStats(prev => ({ ...prev, [gameId]: score }));
            if (user && !user.uid.startsWith('offline-user-')) {
                try {
                    await setDoc(doc(db!, `users/${user.uid}/stats`, gameId), {
                        bestScore: score,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                } catch (e) {
                    if (!ignorePermissionError(e)) console.warn(e);
                }
            }
            return true;
        }
        return false;
    };

    const value = {
        items, history, receivedHistory, favorites, offers, savedOffers, arcadeStats, formatCurrency,
        addItem, addIngredientsBatch, deleteItem, updateItem, deleteRecipeGroup, toggleItemPurchased,
        savePurchase, deleteHistoryRecord, finishWithoutSaving, addHistoricItem, repeatPurchase, findDuplicate,
        importSharedList, saveReceivedListToHistory, getItemHistory, searchUser, shareListWithEmail, shareListWithPartner,
        markReceivedListAsRead, unreadReceivedCount, toggleFavorite, isFavorite, toggleOfferSaved, isOfferSaved,
        addReview, deleteReview, getProductReviews, logAdminAction, getTeamMembers, getMemberLogs, updateArcadeStat
    };

    return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>;
};

export const useShoppingList = () => {
    const context = useContext(ShoppingListContext);
    if (context === undefined) {
        throw new Error('useShoppingList must be used within a ShoppingListProvider');
    }
    return context;
};
