
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord } from '../types';
import { useShoppingList } from './ShoppingListContext';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'christmas' | 'newyear';

// Helper function to safely map data to FullRecipe objects
const mapToFullRecipeArray = (data: any): FullRecipe[] => {
    if (!Array.isArray(data)) return [];
    return data.map((r: any): FullRecipe => ({
        name: String(r.name || 'Receita'),
        ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((i: any) => ({
            simplifiedName: String(i.simplifiedName || ''),
            detailedName: String(i.detailedName || '')
        })) : [],
        instructions: Array.isArray(r.instructions) ? r.instructions.map(String) : [],
        imageQuery: String(r.imageQuery || r.name || ''),
        servings: String(r.servings || '2 porções'),
        prepTimeInMinutes: Number(r.prepTimeInMinutes || 30),
        difficulty: (r.difficulty === 'Fácil' || r.difficulty === 'Médio' || r.difficulty === 'Difícil' ? r.difficulty : 'Médio') as 'Fácil' | 'Médio' | 'Difícil',
        cost: (r.cost === 'Baixo' || r.cost === 'Médio' || r.cost === 'Alto' ? r.cost : 'Médio') as 'Baixo' | 'Médio' | 'Alto',
        imageUrl: r.imageUrl,
        imageSource: r.imageSource || 'cache',
        description: r.description,
        keywords: Array.isArray(r.keywords) ? r.keywords.map(String) : [],
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
        isAlcoholic: !!r.isAlcoholic,
        suggestedLeads: Array.isArray(r.suggestedLeads) ? r.suggestedLeads.map(String) : []
    }));
};

interface AppContextType {
    // Modal States
    isAddItemModalOpen: boolean;
    isBudgetModalOpen: boolean;
    isRecipeAssistantModalOpen: boolean;
    isOptionsMenuOpen: boolean;
    isAppOptionsMenuOpen: boolean;
    isCalculatorModalOpen: boolean;
    isAboutModalOpen: boolean;
    isSavePurchaseModalOpen: boolean;
    isHistoryModalOpen: boolean;
    isAuthModalOpen: boolean;
    isContactModalOpen: boolean;
    isTourModalOpen: boolean;
    isProfileModalOpen: boolean;
    isThemeModalOpen: boolean;
    isSharedListModalOpen: boolean;
    isFeedbackModalOpen: boolean;
    isPreferencesModalOpen: boolean;
    isSmartNudgeModalOpen: boolean;
    isRecipeDecisionModalOpen: boolean;
    isFavoritesModalOpen: boolean;
    isOffersModalOpen: boolean;
    isAdminModalOpen: boolean;
    isAdminRecipesModalOpen: boolean;
    isInfoModalOpen: boolean;
    isStartShoppingModalOpen: boolean;
    isShareListModalOpen: boolean;
    isThemeRecipesModalOpen: boolean;
    isToolsModalOpen: boolean;
    
    // Modal Controls
    openModal: (modal: string) => void;
    closeModal: (modal: string) => void;
    toggleAppOptionsMenu: () => void;
    toggleOptionsMenu: () => void;

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // PWA Install
    installPromptEvent: any;
    handleInstall: () => Promise<boolean>;
    handleDismissInstall: () => void;
    isPWAInstallVisible: boolean; 
    
    // Budget
    budget: number | null;
    setBudget: (newBudget: number) => void;
    clearBudget: () => void;

    // Toasts & Tooltips
    toastMessage: string | null;
    showToast: (message: string) => void;
    isCartTooltipVisible: boolean;
    showCartTooltip: () => void;

    // Recipes
    fullRecipes: Record<string, FullRecipe>;
    selectedRecipe: FullRecipe | null;
    isRecipeLoading: boolean;
    recipeError: string | null;
    fetchRecipeDetails: (recipeName: string, imageBase64?: string, autoAdd?: boolean) => Promise<void>;
    handleRecipeImageGenerated: (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => void;
    showRecipe: (recipeName: string) => void;
    closeRecipe: () => void;
    resetRecipeState: () => void; 
    
    // Recipe Discovery / Home
    featuredRecipes: FullRecipe[];
    recipeSuggestions: FullRecipe[];
    isSuggestionsLoading: boolean;
    currentTheme: string | null;
    fetchThemeSuggestions: (prompt: string) => Promise<void>;
    handleExploreRecipeClick: (recipeName: string) => void;
    pendingExploreRecipe: string | null;
    setPendingExploreRecipe: (name: string | null) => void;
    totalRecipeCount: number;

    // Editing & Duplicates
    editingItemId: string | null;
    startEdit: (id: string) => void;
    cancelEdit: () => void;
    duplicateInfo: DuplicateInfo | null;
    setDuplicateInfo: (info: DuplicateInfo | null) => void;

    // List Organization
    groupingMode: 'recipe' | 'aisle' | 'responsible';
    setGroupingMode: (mode: 'recipe' | 'aisle' | 'responsible') => void;
    isOrganizing: boolean;
    toggleGrouping: () => Promise<void>;
    itemCategories: Record<string, string>;

    // Onboarding & Views
    showStartHerePrompt: boolean;
    isHomeViewActive: boolean;
    setHomeViewActive: (active: boolean) => void;
    
    // Auth Source
    authTrigger: string | null;
    setAuthTrigger: (trigger: string | null) => void;
    isAdmin: boolean;

    // Real-time Notifications & Sharing
    incomingList: ReceivedListRecord | null;
    clearIncomingList: () => void;
    unreadNotificationCount: number;
    currentMarketName: string | null;
    setCurrentMarketName: (name: string | null) => void;
    isSharedSession: boolean;
    setIsSharedSession: (isShared: boolean) => void;

    // Smart Features
    smartNudgeItemName: string | null;
    
    // UI Mode
    isFocusMode: boolean;
    setFocusMode: (mode: boolean) => void;
    
    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;
    getCategoryRecipesSync: (categoryKey: string) => FullRecipe[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// FIX: Added missing isOrganizing, itemCategories, isFocusMode states and logic
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { items, findDuplicate, addIngredientsBatch, unreadReceivedCount, favorites } = useShoppingList();
    const { user } = useAuth();

    const [modalStates, setModalStates] = useState({
        isAddItemModalOpen: false, isBudgetModalOpen: false, isRecipeAssistantModalOpen: false,
        isOptionsMenuOpen: false, isAppOptionsMenuOpen: false, isCalculatorModalOpen: false,
        isAboutModalOpen: false, isSavePurchaseModalOpen: false, isHistoryModalOpen: false,
        isAuthModalOpen: false, isContactModalOpen: false, isTourModalOpen: false,
        isProfileModalOpen: false, isThemeModalOpen: false,
        isSharedListModalOpen: false,
        isFeedbackModalOpen: false,
        isPreferencesModalOpen: false,
        isSmartNudgeModalOpen: false,
        isRecipeDecisionModalOpen: false,
        isFavoritesModalOpen: false,
        isOffersModalOpen: false,
        isAdminModalOpen: false,
        isAdminRecipesModalOpen: false,
        isInfoModalOpen: false,
        isStartShoppingModalOpen: false,
        isShareListModalOpen: false,
        isThemeRecipesModalOpen: false,
        isToolsModalOpen: false
    });
    
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'christmas' || stored === 'newyear') return stored as Theme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [isPWAInstallVisible, setIsPWAInstallVisible] = useState(false);
    const [budget, setBudgetState] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isCartTooltipVisible, setIsCartTooltipVisible] = useState(false);
    const [fullRecipes, setFullRecipes] = useState<Record<string, FullRecipe>>({});
    const [selectedRecipe, setSelectedRecipe] = useState<FullRecipe | null>(null);
    const [isRecipeLoading, setIsRecipeLoading] = useState(false);
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
    const [groupingMode, setGroupingMode] = useState<'recipe' | 'aisle' | 'responsible'>('recipe');
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
    const [showStartHerePrompt, setShowStartHerePrompt] = useState(false);
    const [authTrigger, setAuthTrigger] = useState<string | null>(null);
    const [incomingList, setIncomingList] = useState<ReceivedListRecord | null>(null);
    
    // New States
    const [smartNudgeItemName, setSmartNudgeItemName] = useState<string | null>(null);
    const [currentMarketName, setCurrentMarketName] = useState<string | null>(null);
    const [isSharedSession, setIsSharedSession] = useState(false);
    const [isHomeViewActive, setHomeViewActive] = useState(true); 
    const [isFocusMode, setFocusMode] = useState(false);
    
    // Recipe Discovery
    const [featuredRecipes, setFeaturedRecipes] = useState<FullRecipe[]>([]);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);

    const isAdmin = user?.email === 'admin@checklistia.com' || user?.email === 'itensnamao@gmail.com';

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstallPromptEvent(e); };
        window.addEventListener('beforeinstallprompt', handler);
        const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
        if (!hasSeenTour) setModalStates(s => ({...s, isTourModalOpen: true}));
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'christmas', 'newyear');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        let timer: number;
        if (toastMessage) timer = window.setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const openModal = (modal: string) => {
        if (modal === 'addItem' && showStartHerePrompt) setShowStartHerePrompt(false);
        if (modal !== 'auth') setAuthTrigger(null);
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'favorites') modalKey = 'isFavoritesModalOpen';
        if (modal === 'offers') modalKey = 'isOffersModalOpen';
        if (modal === 'info') modalKey = 'isInfoModalOpen';
        setModalStates(prev => ({...prev, [modalKey]: true}));
    };

    const closeModal = (modal: string) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'favorites') modalKey = 'isFavoritesModalOpen';
        if (modal === 'offers') modalKey = 'isOffersModalOpen';
        if (modal === 'info') modalKey = 'isInfoModalOpen';
         if (modal.toLowerCase() === 'tour') {
            localStorage.setItem('hasSeenOnboardingTour', 'true');
            setShowStartHerePrompt(true);
         }
        setModalStates(prev => ({ ...prev, [modalKey]: false }));
    };

    const toggleAppOptionsMenu = () => setModalStates(prev => ({ ...prev, isAppOptionsMenuOpen: !prev.isAppOptionsMenuOpen }));
    const toggleOptionsMenu = () => setModalStates(prev => ({ ...prev, isOptionsMenuOpen: !prev.isOptionsMenuOpen }));
    const setTheme = (newTheme: Theme) => setThemeState(newTheme);

    const handleInstall = async () => {
        if (!installPromptEvent) return false;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        setInstallPromptEvent(null);
        setIsPWAInstallVisible(false);
        return outcome === 'accepted';
    };
    const handleDismissInstall = () => { setIsPWAInstallVisible(false); };
    const showPWAInstallPromptIfAvailable = () => { if (installPromptEvent) setIsPWAInstallVisible(true); };

    const setBudget = (b: number) => { setBudgetState(b); closeModal('budget'); };
    const clearBudget = () => { setBudgetState(null); closeModal('budget'); };
    const showToast = (msg: string) => setToastMessage(msg);
    const showCartTooltip = () => setIsCartTooltipVisible(true);
    const startEdit = (id: string) => setEditingItemId(id);
    const cancelEdit = () => setEditingItemId(null);
    
    const showRecipe = (name: string) => { 
        const favorite = favorites.find(f => f.name === name);
        if (favorite) {
            setSelectedRecipe(favorite);
        } else if (fullRecipes[name]) {
            setSelectedRecipe(fullRecipes[name]); 
        } else {
            fetchRecipeDetails(name);
        }
    };
    const closeRecipe = () => setSelectedRecipe(null);
    const resetRecipeState = () => { setIsRecipeLoading(false); setRecipeError(null); };
    
    const handleRecipeImageGenerated = (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => {
            if (prev[recipeName]) {
                return {...prev, [recipeName]: {...prev[recipeName], imageUrl: imageUrl, imageSource: source}};
            }
            return prev;
        });
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl: imageUrl, imageSource: source} : prev));
    };

    // FIX: Optimized image generation to follow iteration guidelines
    const generateRecipeImageBackground = async (recipeName: string, imageQuery: string) => {
        try {
             // FIX: Guideline Always use process.env.API_KEY directly
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const response: GenerateContentResponse = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: `Uma foto de comida profissional, realista e apetitosa de ${imageQuery}`
             });
             
             // FIX: Guideline Find image part by iterating
             for (const candidate of response.candidates || []) {
                 for (const part of candidate.content?.parts || []) {
                     if (part.inlineData) {
                         const base64ImageBytes = part.inlineData.data;
                         const mimeType = part.inlineData.mimeType || 'image/jpeg';
                         const generatedUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                         handleRecipeImageGenerated(recipeName, generatedUrl, 'genai');
                         return;
                     }
                 }
             }
        } catch (error) {
            console.error("Erro ao gerar imagem em segundo plano:", error);
        }
    };

    const fetchRecipeDetails = useCallback(async (recipeName: string, imageBase64?: string, autoAdd: boolean = true) => {
        setIsRecipeLoading(true);
        setRecipeError(null);
        try {
            // FIX: Guideline Always use process.env.API_KEY directly
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let systemPrompt = `Gere uma receita completa.`;
            if (recipeName && !imageBase64) {
                 systemPrompt += ` para "${recipeName}".`;
            } else if (imageBase64) {
                 systemPrompt += ` Analise a imagem fornecida, identifique o prato e gere a receita.`;
            }

            systemPrompt += `\nRetorne APENAS um JSON válido: { "name": "Nome", "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícara"}], "instructions": ["Passo 1"], "imageQuery": "foto", "servings": "2", "prepTimeInMinutes": 30, "difficulty": "Fácil", "cost": "Baixo" }`;

            const parts: any[] = [];
            if (imageBase64) {
                 const base64Data = imageBase64.split(',')[1];
                 const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
                 parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
            }
            parts.push({ text: systemPrompt });

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts },
                config: { responseMimeType: "application/json" }
            });

            // FIX: Guideline Use .text property directly
            let textResponse = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}";
            const recipeDetails = JSON.parse(textResponse);
            
            const finalRecipeName = recipeDetails.name || recipeName || "Receita Identificada";
            const fullRecipeData: FullRecipe = { 
                name: String(finalRecipeName),
                ingredients: recipeDetails.ingredients || [],
                instructions: recipeDetails.instructions || [],
                imageQuery: String(recipeDetails.imageQuery || ''),
                servings: String(recipeDetails.servings || ''),
                prepTimeInMinutes: Number(recipeDetails.prepTimeInMinutes || 0),
                difficulty: recipeDetails.difficulty || 'Médio',
                cost: recipeDetails.cost || 'Médio'
            };
            setFullRecipes(prev => ({...prev, [finalRecipeName]: fullRecipeData}));
            setSelectedRecipe(fullRecipeData);
            closeModal('recipeAssistant');
            if (autoAdd) await addRecipeToShoppingList(fullRecipeData);
            if (recipeDetails.imageQuery) generateRecipeImageBackground(finalRecipeName, recipeDetails.imageQuery);

        } catch (e) {
            setRecipeError("Não foi possível gerar esta receita.");
        } finally {
            setIsRecipeLoading(false);
        }
    }, [items, findDuplicate, addIngredientsBatch]);
    
    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (!findDuplicate(ing.simplifiedName, items)) {
                itemsToAdd.push({ name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, isNew: true, isPurchased: false });
            }
        });
        if (itemsToAdd.length > 0) {
            await addIngredientsBatch(itemsToAdd);
            showToast(`${itemsToAdd.length} ingredientes adicionados!`);
        }
    };

    const toggleGrouping = useCallback(async () => {
        if (groupingMode === 'recipe') {
            const itemsToCategorize = items.filter(item => !itemCategories[item.id]);
            if (itemsToCategorize.length === 0) { setGroupingMode('aisle'); return; }
            setIsOrganizing(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue", "🧀 Frios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene", "❓ Outros" ];
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Categorize: [${itemsToCategorize.map(i => `"${i.name}"`).join(', ')}]. Use: ${categories.join(', ')}. Return JSON: [{"itemName": "Nome", "category": "Categoria"}]`,
                    config: { responseMimeType: "application/json" }
                });
                const categorizedItems = JSON.parse(response.text || "[]");
                const newCategoryMap = { ...itemCategories };
                categorizedItems.forEach((ci: any) => {
                    const item = itemsToCategorize.find(i => i.name.toLowerCase() === ci.itemName.toLowerCase());
                    if (item) newCategoryMap[item.id] = ci.category;
                });
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
            } catch (error) { showToast("Erro ao organizar."); }
            finally { setIsOrganizing(false); }
        } else {
            setGroupingMode('recipe');
        }
    }, [groupingMode, items, itemCategories]);

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu, theme, setTheme,
        installPromptEvent, handleInstall, handleDismissInstall, isPWAInstallVisible,
        budget, setBudget, clearBudget, toastMessage, showToast, isCartTooltipVisible: false, showCartTooltip,
        fullRecipes, selectedRecipe, isRecipeLoading, recipeError, fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, closeRecipe, resetRecipeState,
        featuredRecipes: [], recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions: async () => {}, handleExploreRecipeClick: () => {}, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        editingItemId, startEdit, cancelEdit, duplicateInfo, setDuplicateInfo, groupingMode, setGroupingMode, isOrganizing, toggleGrouping, itemCategories,
        showStartHerePrompt, isHomeViewActive, setHomeViewActive, authTrigger, setAuthTrigger, isAdmin,
        incomingList, clearIncomingList: () => setIncomingList(null), unreadNotificationCount, currentMarketName, setCurrentMarketName, isSharedSession, setIsSharedSession,
        smartNudgeItemName, isFocusMode, setFocusMode, addRecipeToShoppingList, showPWAInstallPromptIfAvailable, getCategoryRecipesSync: () => []
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};
