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
    increment,
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
    formatCurrency: (value: number) => string;
    addItem: (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased' | 'creatorUid' | 'creatorDisplayName' | 'creatorPhotoURL' | 'listId' | 'responsibleUid' | 'responsibleDisplayName'>) => Promise<void>;
    addIngredientsBatch: (items: any[]) => Promise<void>;
    deleteItem: (id: string) => void;
    updateItem: (item: ShoppingItem) => Promise<void>;
    deleteRecipeGroup: (recipeName: string) => void;
    toggleItemPurchased: (id: string) => void;
    savePurchase: (marketName: string) => Promise<void>;
    finishWithoutSaving: () => Promise<void>;
    addHistoricItem: (item: HistoricItem) => Promise<void>;
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
    toggleFavorite: (recipe: FullRecipe) => Promise<void>;
    isFavorite: (recipeName: string) => boolean;
    toggleOfferSaved: (offer: Offer) => Promise<void>; 
    isOfferSaved: (offerId: string) => boolean; 
    addReview: (offerId: string, offerName: string, offerImage: string, rating: number, comment: string) => Promise<void>;
    deleteReview: (reviewId: string, offerId: string) => Promise<void>;
    getProductReviews: (offerId: string) => Promise<Review[]>;
    logAdminAction: (actionType: 'create' | 'update' | 'delete' | 'login', targetName: string, details?: string) => Promise<void>;
    getTeamMembers: () => Promise<User[]>;
    getMemberLogs: (userId: string) => Promise<ActivityLog[]>;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

export const ShoppingListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [history, setHistory] = useState<PurchaseRecord[]>([]);
    const [receivedHistory, setReceivedHistory] = useState<ReceivedListRecord[]>([]);
    const [favorites, setFavorites] = useState<FullRecipe[]>([]);
    const [savedOffers, setSavedOffers] = useState<Offer[]>([]); 
    const [offers, setOffers] = useState<Offer[]>([]);

    const STORAGE_KEY = 'guestShoppingList';
    const HISTORY_STORAGE_KEY = 'guestShoppingHistory';

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
            console.error("Error marking list as read:", error);
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
            console.warn("Erro ao carregar ofertas:", error.message);
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
        }, (error) => console.warn("Erro ao carregar itens:", error.message));

        const historyRef = collection(db, `users/${listId}/history`);
        const qHistory = query(historyRef, orderBy('date', 'desc'));
        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const loadedHistory: PurchaseRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PurchaseRecord));
            setHistory(loadedHistory);
        }, (error) => console.warn("Erro ao carregar histórico:", error.message));

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
        }, (error) => console.warn("Erro ao carregar listas recebidas:", error.message));

        const favoritesRef = collection(db, `users/${user.uid}/favorites`);
        const qFavorites = query(favoritesRef, orderBy('savedAt', 'desc'));
        const unsubscribeFavorites = onSnapshot(qFavorites, (snapshot) => {
            const loadedFavorites: FullRecipe[] = snapshot.docs.map(doc => doc.data() as FullRecipe);
            setFavorites(loadedFavorites);
        }, (error) => console.warn("Erro ao carregar favoritos:", error.message));

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
        }, (error) => console.warn("Erro ao carregar ofertas salvas:", error.message));

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
        }
    }, [items, user]);

    const findDuplicate = useCallback((name: string, currentItems: ShoppingItem[]) => {
        const normalize = (s: string) => s.toLowerCase().trim();
        const target = normalize(name);
        return currentItems.find(i => normalize(i.name) === target);
    }, []);

    const isOnline = user && !user.uid.startsWith('offline-user-') && db;

    const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased' | 'creatorUid' | 'creatorDisplayName' | 'creatorPhotoURL' | 'listId' | 'responsibleUid' | 'responsibleDisplayName'>) => {
        const activeListId = user ? (user.activeListId || user.uid) : undefined;
        const newItem: ShoppingItem = {
            ...item,
            id: isOnline ? '' : Date.now().toString(),
            displayPrice: formatCurrency(item.calculatedPrice),
            isPurchased: item.calculatedPrice > 0,
            isNew: true,
            creatorUid: user?.uid || null,
            creatorDisplayName: user?.displayName || null,
            creatorPhotoURL: user?.photoURL || null,
            listId: activeListId || null,
            responsibleUid: null,
            responsibleDisplayName: null,
            recipeName: item.recipeName || null
        };
        try {
            if (isOnline && activeListId) {
                const { id, ...data } = newItem;
                const sanitizedData = Object.fromEntries(
                    Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
                );
                await addDoc(collection(db, `users/${activeListId}/items`), sanitizedData);
            } else {
                setItems(prev => [...prev, newItem]);
            }
        } catch (error) {
            console.error("Error adding item:", error);
            throw error;
        }
    }, [user, isOnline]);

    const addIngredientsBatch = useCallback(async (newItems: any[]) => {
        const activeListId = user ? (user.activeListId || user.uid) : undefined;
        if (isOnline && activeListId) {
            const batch = writeBatch(db);
            const itemsRef = collection(db, `users/${activeListId}/items`);
            newItems.forEach(item => {
                const docRef = doc(itemsRef);
                const itemWithCreator = {
                    ...item,
                    displayPrice: formatCurrency(item.calculatedPrice),
                    isPurchased: item.isPurchased || false,
                    isNew: true,
                    creatorUid: user.uid || null,
                    creatorDisplayName: user.displayName || null,
                    creatorPhotoURL: user.photoURL || null,
                    listId: activeListId || null,
                    responsibleUid: null,
                    responsibleDisplayName: null,
                    recipeName: item.recipeName || null
                };
                const sanitizedItem = Object.fromEntries(
                    Object.entries(itemWithCreator).map(([key, value]) => [key, value === undefined ? null : value])
                );
                batch.set(docRef, sanitizedItem);
            });
            await batch.commit();
        } else {
            const itemsWithIds = newItems.map((item, idx) => ({
                ...item,
                id: Date.now().toString() + idx,
                displayPrice: formatCurrency(item.calculatedPrice),
                isPurchased: item.isPurchased || false,
                isNew: true,
                responsibleUid: null,
                responsibleDisplayName: null,
                recipeName: item.recipeName || null
            }));
            setItems(prev => [...prev, ...itemsWithIds]);
        }
    }, [user, isOnline]);

    const deleteItem = useCallback(async (id: string) => {
        if (isOnline && user) {
            const listId = user.activeListId || user.uid;
            await deleteDoc(doc(db, `users/${listId}/items`, id));
        } else {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    }, [user, isOnline]);

    const updateItem = useCallback(async (updatedItem: ShoppingItem) => {
        const itemData = { 
            ...updatedItem, 
            displayPrice: formatCurrency(updatedItem.calculatedPrice), 
            isNew: false, 
            isPurchased: updatedItem.calculatedPrice > 0 
        };
        if (isOnline && user) {
             const listId = user.activeListId || user.uid;
             const { id, ...dataToSave } = itemData;
             const sanitizedData = Object.fromEntries(
                Object.entries(dataToSave).map(([key, value]) => [key, value === undefined ? null : value])
             );
             await updateDoc(doc(db, `users/${listId}/items`, id), sanitizedData);
        } else {
            setItems(prev => prev.map(item => item.id === itemData.id ? itemData : item));
        }
    }, [user, isOnline]);

    const deleteRecipeGroup = useCallback(async (recipeName: string) => {
        const filterFn = (item: ShoppingItem) => item.recipeName === recipeName;
        if (isOnline && user) {
            const listId = user.activeListId || user.uid;
            const batch = writeBatch(db);
            const itemsToDelete = items.filter(filterFn);
            if (itemsToDelete.length === 0) return;
            itemsToDelete.forEach(item => {
                batch.delete(doc(db, `users/${listId}/items`, item.id));
            });
            await batch.commit();
        } else {
            setItems(prev => prev.filter(item => !filterFn(item)));
        }
    }, [user, items, isOnline]);

    const toggleItemPurchased = useCallback(async (id: string) => {
        if (isOnline && user) {
            const listId = user.activeListId || user.uid;
            const item = items.find(i => i.id === id);
            if (item) {
                await updateDoc(doc(db, `users/${listId}/items`, id), {
                    isPurchased: !item.isPurchased
                });
            }
        } else {
            setItems(prev => prev.map(item => item.id === id ? { ...item, isPurchased: !item.isPurchased } : item));
        }
    }, [user, items, isOnline]);

    const savePurchase = useCallback(async (marketName: string) => {
        if (items.length === 0) return;
        const purchasedItems = items.filter(i => i.isPurchased);
        const total = purchasedItems.reduce((acc, curr) => acc + curr.calculatedPrice, 0);

        if (purchasedItems.length > 0) {
            const purchaseRecord: Omit<PurchaseRecord, 'id'> = {
                date: new Date().toISOString(),
                marketName: marketName || 'Compra Geral',
                total,
                items: purchasedItems.map(i => ({
                    name: i.name,
                    displayPrice: i.displayPrice,
                    calculatedPrice: i.calculatedPrice,
                    details: i.details
                }))
            };

            if (isOnline && user) {
                const listId = user.activeListId || user.uid;
                const historyRef = collection(db, `users/${listId}/history`);
                await addDoc(historyRef, purchaseRecord);
            } else {
                const newRecord = { ...purchaseRecord, id: Date.now().toString() } as PurchaseRecord;
                const updatedHistory = [newRecord, ...history];
                setHistory(updatedHistory);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
            }
        }

        if (isOnline && user) {
            const listId = user.activeListId || user.uid;
            const batch = writeBatch(db);
            items.forEach(item => {
                const itemRef = doc(db, `users/${listId}/items`, item.id);
                batch.delete(itemRef);
            });
            await batch.commit();
        } else {
            setItems([]);
        }
    }, [user, items, isOnline, history]);

    const finishWithoutSaving = useCallback(async () => {
        setItems([]);
        if (isOnline && user) {
            try {
                const listId = user.activeListId || user.uid;
                const itemsRef = collection(db, `users/${listId}/items`);
                const querySnapshot = await getDocs(itemsRef);
                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                await batch.commit();
            } catch (error) { console.error("Erro ao limpar lista:", error); }
        }
    }, [user, isOnline]);

    const addHistoricItem = useCallback(async (historicItem: HistoricItem) => {
        const newItem: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased' | 'creatorUid' | 'creatorDisplayName' | 'creatorPhotoURL' | 'listId' | 'responsibleUid' | 'responsibleDisplayName'> = {
            name: historicItem.name,
            calculatedPrice: 0,
            details: historicItem.details,
            recipeName: undefined
        };
        await addItem(newItem);
    }, [addItem]);

    const repeatPurchase = useCallback(async (purchase: PurchaseRecord) => {
        const isMerging = items.length > 0;
        
        const itemsToAdd = purchase.items.map(i => ({
            name: i.name,
            calculatedPrice: 0, // Resetamos o preço para que o usuário insira o valor atual
            details: i.details,
            // Se estiver mesclando, usa um prefixo para organizar como uma "aba" (grupo)
            recipeName: isMerging ? `Histórico: ${purchase.marketName}` : (purchase.marketName || 'Retomado'),
            isNew: true,
            isPurchased: false // Resetamos o status para que o item apareça como "pendente" na nova compra
        }));

        // Se a lista estiver vazia, restaura o nome do mercado original no topo
        if (!isMerging) {
            window.dispatchEvent(new CustomEvent('restoreMarketName', { detail: purchase.marketName }));
        }

        await addIngredientsBatch(itemsToAdd);
        return { message: `${itemsToAdd.length} itens prontos para uma nova compra!` };
    }, [addIngredientsBatch, items.length]);

    const importSharedList = useCallback(async (shareId: string) => {
        if (!db) return null;
        try {
            const shareDoc = await getDoc(doc(db, 'shared_lists', shareId));
            if (shareDoc.exists()) {
                return shareDoc.data() as { marketName: string; items: any[]; author?: any };
            }
            return null;
        } catch (error) { return null; }
    }, []);

    const saveReceivedListToHistory = useCallback(async (data: any) => {
        if (isOnline && user) {
            try {
                 await addDoc(collection(db, `users/${user.uid}/received_lists`), {
                    ...data,
                    date: new Date().toISOString(),
                    itemCount: data.items.length,
                    read: false,
                 });
            } catch (error) { console.error("Error saving received list:", error); }
        }
    }, [user, isOnline]);

    const getItemHistory = useCallback((itemName: string) => {
        const normalize = (s: string) => s.toLowerCase().trim();
        const target = normalize(itemName);
        const results: { price: number; date: string; marketName: string; details: string }[] = [];
        history.forEach(purchase => {
            purchase.items.forEach(item => {
                if (normalize(item.name) === target && item.calculatedPrice > 0) {
                    results.push({
                        price: item.calculatedPrice,
                        date: purchase.date,
                        marketName: purchase.marketName,
                        details: item.details
                    });
                }
            });
        });
        return results;
    }, [history]);

    const searchUser = useCallback(async (identifier: string): Promise<AuthorMetadata | null> => {
        if (!db) return null;
        const cleanIdentifier = identifier.trim().toLowerCase();
        try {
            if (cleanIdentifier.startsWith('@')) {
                const usernameToFind = cleanIdentifier.substring(1);
                const q = query(collection(db, 'users_public'), where('username', '==', usernameToFind));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    return querySnapshot.docs[0].data() as AuthorMetadata;
                }
            } else {
                const publicUserRef = doc(db, 'users_public', cleanIdentifier);
                const publicUserSnap = await getDoc(publicUserRef);
                if (publicUserSnap.exists()) {
                     return publicUserSnap.data() as AuthorMetadata;
                }
            }
        } catch (error) { console.error("Error searching user:", error); }
        return null;
    }, []);

    const shareListWithEmail = useCallback(async (purchase: PurchaseRecord, identifier: string) => {
        if (isOnline && user) {
            try {
                const shareData = {
                    marketName: purchase.marketName,
                    items: purchase.items,
                    author: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, username: user.username },
                    createdAt: serverTimestamp()
                };
                const shareRef = await addDoc(collection(db, 'shared_lists'), shareData);
                const shareUrl = `${window.location.origin}?share_id=${shareRef.id}`;
                const targetUserData = await searchUser(identifier);
                if (targetUserData) {
                    const targetUid = targetUserData.uid;
                    await addDoc(collection(db, `users/${targetUid}/received_lists`), {
                        shareId: shareRef.id,
                        marketName: purchase.marketName,
                        items: purchase.items,
                        itemCount: purchase.items.length,
                        author: shareData.author,
                        date: new Date().toISOString(),
                        read: false
                    });
                    return { success: true, type: 'direct' as const, shareUrl, recipientName: targetUserData.displayName };
                }
                return { success: true, type: 'link' as const, shareUrl };
            } catch (error) { throw error; }
        }
        return { success: false, type: 'link' as const };
    }, [user, searchUser, isOnline]);

    const shareListWithPartner = useCallback(async (identifier: string, listToShareId: string) => {
        if (!isOnline || !user) return { success: false, message: "Erro: Usuário offline ou DB não conectado." };
        const partnerData = await searchUser(identifier);
        if (!partnerData || partnerData.uid === user.uid) {
             return { success: false, message: "Parceiro(a) não encontrado(a) ou é você mesmo." };
        }
        const inviteRef = await addDoc(collection(db, 'invitations'), {
            fromUid: user.uid, toUid: partnerData.uid, listId: listToShareId, status: 'pending', marketName: "Lista Compartilhada", createdAt: serverTimestamp(), fromName: user.displayName || 'Alguém'
        });
        return { success: true, message: `Convite enviado para ${partnerData.displayName || 'parceiro(a)'}.`, inviteId: inviteRef.id };
    }, [user, searchUser, isOnline]);

    const normalizeRecipeId = (str: string) => {
        return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_"); 
    };

    const isFavorite = useCallback((recipeName: string) => {
        const id = normalizeRecipeId(recipeName);
        return favorites.some(f => normalizeRecipeId(f.name) === id);
    }, [favorites]);

    const toggleFavorite = useCallback(async (recipe: FullRecipe) => {
        if (!isOnline || !user) return;
        const recipeId = normalizeRecipeId(recipe.name);
        const docRef = doc(db, `users/${user.uid}/favorites`, recipeId);
        try {
            if (isFavorite(recipe.name)) {
                await deleteDoc(docRef);
            } else {
                const sanitizedRecipe = Object.fromEntries(
                    Object.entries(recipe).map(([key, value]) => [key, value === undefined ? null : value])
                );
                await setDoc(docRef, { ...sanitizedRecipe, savedAt: serverTimestamp() });
            }
        } catch (error) { console.error("Error toggling favorite:", error); }
    }, [user, isFavorite, isOnline]);

    const isOfferSaved = useCallback((offerId: string) => {
        return savedOffers.some(o => o.id === offerId);
    }, [savedOffers]);

    const toggleOfferSaved = useCallback(async (offer: Offer) => {
        if (!isOnline || !user) return;
        const docRef = doc(db, `users/${user.uid}/saved_offers`, offer.id);
        try {
            if (isOfferSaved(offer.id)) {
                await deleteDoc(docRef);
            } else {
                const cleanOffer = JSON.parse(JSON.stringify(offer));
                await setDoc(docRef, { ...cleanOffer, savedAt: serverTimestamp() });
            }
        } catch (error) { console.error("Erro ao salvar oferta:", error); }
    }, [user, isOfferSaved, isOnline]);

    const addReview = useCallback(async (offerId: string, offerName: string, offerImage: string, rating: number, comment: string) => {
        if (!isOnline || !user || !db) return;
        try {
            const reviewData: any = { offerId, offerName, offerImage, userId: user.uid, userName: user.displayName || 'Usuário', userPhotoURL: user.photoURL || null, rating, comment, createdAt: serverTimestamp() };
            await addDoc(collection(db, 'reviews'), reviewData);
        } catch (error) { throw error; }
    }, [user, isOnline]);

    const deleteReview = useCallback(async (reviewId: string, offerId: string) => {
        if (!isOnline || !db) return;
        try { await deleteDoc(doc(db, 'reviews', reviewId)); } catch (error) { throw error; }
    }, [isOnline]);

    const getProductReviews = useCallback(async (offerId: string): Promise<Review[]> => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'reviews'), where('offerId', '==', offerId));
            const snapshot = await getDocs(q);
            const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
            reviews.sort((a, b) => {
                const getMillis = (d: any) => {
                    if (!d) return 0;
                    if (d.toDate) return d.toDate().getTime();
                    if (d.seconds) return d.seconds * 1000;
                    return new Date(d).getTime();
                };
                return getMillis(b.createdAt) - getMillis(a.createdAt);
            });
            return reviews;
        } catch (error) { return []; }
    }, []);

    const logAdminAction = useCallback(async (actionType: 'create' | 'update' | 'delete' | 'login', targetName: string, details?: string) => {
        if (!isOnline || !user || !db) return;
        if (user.role !== 'admin_l1' && user.role !== 'admin_l2') return;
        try {
            const logData: Omit<ActivityLog, 'id'> = { userId: user.uid, userName: user.displayName || 'Admin', userPhoto: user.photoURL, actionType, targetName, details: details || '', timestamp: serverTimestamp() };
            await addDoc(collection(db, 'admin_logs'), logData);
        } catch (error) { console.error("Erro ao registrar log:", error); }
    }, [user, isOnline]);

    const getTeamMembers = useCallback(async (): Promise<User[]> => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'admin_l2'));
            const snapshot = await getDocs(q);
            const members: User[] = [];
            for (const docSnap of snapshot.docs) {
                const userData = docSnap.data();
                let publicInfo = {};
                if (userData.email) {
                    try {
                        const publicDoc = await getDoc(doc(db, 'users_public', userData.email.toLowerCase()));
                        if(publicDoc.exists()) publicInfo = publicDoc.data();
                    } catch(e) {}
                }
                members.push({ uid: docSnap.id, role: 'admin_l2', displayName: userData.displayName || (publicInfo as any).displayName || 'Membro', photoURL: userData.photoBase64 || (publicInfo as any).photoURL || null, username: userData.username || (publicInfo as any).username || null, email: userData.email || null } as User);
            }
            return members;
        } catch (error) { return []; }
    }, []);

    const getMemberLogs = useCallback(async (userId: string): Promise<ActivityLog[]> => {
        if (!db) return [];
        try {
            const q = query(collection(db, 'admin_logs'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
        } catch (error) { return []; }
    }, []);

    return (
        <ShoppingListContext.Provider value={{
            items, history, receivedHistory, favorites, offers, savedOffers, formatCurrency, addItem, addIngredientsBatch, deleteItem, updateItem, deleteRecipeGroup, toggleItemPurchased, savePurchase, finishWithoutSaving, addHistoricItem, repeatPurchase, findDuplicate, importSharedList, saveReceivedListToHistory, getItemHistory, searchUser, shareListWithEmail, shareListWithPartner, markReceivedListAsRead, unreadReceivedCount, toggleFavorite, isFavorite, toggleOfferSaved, isOfferSaved, addReview, deleteReview, getProductReviews, logAdminAction, getTeamMembers, getMemberLogs
        }}>
            {children}
        </ShoppingListContext.Provider>
    );
};

export const useShoppingList = (): ShoppingListContextType => {
    const context = useContext(ShoppingListContext);
    if (context === undefined) throw new Error('useShoppingList must be used within a ShoppingListProvider');
    return context;
};