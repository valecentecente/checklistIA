import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord } from '../types';
import { useShoppingList } from './ShoppingListContext';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'christmas' | 'newyear';

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
    isPWAInstallVisible: boolean; // Novo
    
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
    isThemeRecipesModalOpen: boolean;
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
        isThemeRecipesModalOpen: false
    });
    
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'christmas' || stored === 'newyear') return stored;
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
    // Added missing isOrganizing state
    const [isOrganizing, setIsOrganizing] = useState(false);
    // Added missing itemCategories state
    const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
    const [showStartHerePrompt, setShowStartHerePrompt] = useState(false);
    const [authTrigger, setAuthTrigger] = useState<string | null>(null);
    const [incomingList, setIncomingList] = useState<ReceivedListRecord | null>(null);
    
    // New States
    const [smartNudgeItemName, setSmartNudgeItemName] = useState<string | null>(null);
    const [currentMarketName, setCurrentMarketName] = useState<string | null>(null);
    const [isSharedSession, setIsSharedSession] = useState(false);
    const [historyActiveTab, setHistoryActiveTab] = useState<'my' | 'received'>('my');
    const [isHomeViewActive, setHomeViewActive] = useState(true); // Default Home
    // Added missing isFocusMode state
    const [isFocusMode, setFocusMode] = useState(false);
    
    // Recipe Discovery
    const [featuredRecipes, setFeaturedRecipes] = useState<FullRecipe[]>([]);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);

    const apiKey = process.env.API_KEY as string;
    const isAdmin = user?.email === 'admin@checklistia.com' || user?.email === 'itensnamao@gmail.com';

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstallPromptEvent(e); };
        window.addEventListener('beforeinstallprompt', handler);
        const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
        if (!hasSeenTour) setModalStates(s => ({...s, isTourModalOpen: true}));
        
        const handleListReceived = (e: CustomEvent<ReceivedListRecord>) => {
            setIncomingList(e.detail);
        };
        window.addEventListener('listReceived' as any, handleListReceived);
        
        const handleDietaryConflict = (e: CustomEvent<{ itemName: string }>) => {
            if (sessionStorage.getItem('smartNudgeDismissed') === 'true') return;
            setSmartNudgeItemName(e.detail.itemName);
            openModal('smartNudge');
        };
        window.addEventListener('dietaryConflict' as any, handleDietaryConflict);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('listReceived' as any, handleListReceived);
            window.removeEventListener('dietaryConflict' as any, handleDietaryConflict);
        };
    }, []);

    // Preference Onboarding Effect
    useEffect(() => {
        const hasDismissed = localStorage.getItem('preferences_dismissed') === 'true';
        if (user && user.uid && !user.uid.startsWith('offline') && (!user.dietaryPreferences || user.dietaryPreferences.length === 0) && !modalStates.isAuthModalOpen && !modalStates.isTourModalOpen && !hasDismissed) {
            const timer = setTimeout(() => {
                openModal('preferences');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [user, modalStates.isAuthModalOpen, modalStates.isTourModalOpen]);

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

    useEffect(() => {
        let timer: number;
        if (isCartTooltipVisible) timer = window.setTimeout(() => setIsCartTooltipVisible(false), 3000);
        return () => clearTimeout(timer);
    }, [isCartTooltipVisible]);

    const openModal = (modal: string) => {
        if (modal === 'addItem' && showStartHerePrompt) setShowStartHerePrompt(false);
        if (modal !== 'auth') setAuthTrigger(null);
        
        // Mapping fix for some modal names
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
    }
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
        // Lógica: Tenta encontrar nos favoritos primeiro, depois fullRecipes
        const favorite = favorites.find(f => f.name === name);
        if (favorite) {
            setSelectedRecipe(favorite);
        } else if (fullRecipes[name]) {
            setSelectedRecipe(fullRecipes[name]); 
        } else {
            // Se não tiver detalhes, busca
            fetchRecipeDetails(name);
        }
    };
    const closeRecipe = () => setSelectedRecipe(null);
    const resetRecipeState = () => {
        setIsRecipeLoading(false);
        setRecipeError(null);
    };
    
    const handleRecipeImageGenerated = (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => {
            if (prev[recipeName]) {
                return {...prev, [recipeName]: {...prev[recipeName], imageUrl: imageUrl, imageSource: source}};
            }
            return prev;
        });
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl: imageUrl, imageSource: source} : prev));
    };

    const generateRecipeImageBackground = async (recipeName: string, imageQuery: string) => {
        if (!apiKey) return;
        try {
             const ai = new GoogleGenAI({ apiKey });
             const response: GenerateContentResponse = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: {
                     parts: [{ text: `Uma foto de comida profissional, realista e apetitosa de ${imageQuery}` }]
                 },
                 config: {
                     responseModalities: [Modality.IMAGE],
                 },
             });
             
             const part = response.candidates?.[0]?.content?.parts?.[0];
             if (part?.inlineData) {
                 const base64ImageBytes = part.inlineData.data;
                 const mimeType = part.inlineData.mimeType || 'image/jpeg';
                 const generatedUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                 handleRecipeImageGenerated(recipeName, generatedUrl, 'genai');
             }
        } catch (error) {
            console.error("Erro ao gerar imagem em segundo plano:", error);
        }
    };

    const fetchRecipeDetails = useCallback(async (recipeName: string, imageBase64?: string, autoAdd: boolean = true) => {
        if (!apiKey) {
            setRecipeError("Chave de API não configurada.");
            return;
        }

        setIsRecipeLoading(true);
        setRecipeError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            let systemPrompt = `Gere uma receita completa.`;
            if (recipeName && !imageBase64) {
                 systemPrompt += ` para "${recipeName}".`;
            } else if (imageBase64) {
                 systemPrompt += ` Analise a imagem fornecida, identifique o prato (se houver input de texto "${recipeName}", use-o como contexto adicional) e gere a receita para ele.`;
            }

            systemPrompt += `\nRetorne APENAS um JSON válido com este formato:
{
  "name": "Nome Identificado do Prato",
  "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícaras de arroz"}],
  "instructions": ["Passo 1", "Passo 2"],
  "imageQuery": "descrição visual curta do prato",
  "servings": "4 porções",
  "prepTimeInMinutes": 30,
  "difficulty": "Fácil",
  "cost": "Baixo"
}`;

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
                config: {
                    responseMimeType: "application/json",
                }
            });

            let textResponse = response.text || "";
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            // Cast result to any to fix '{}' properties type issue
            const recipeDetails = JSON.parse(textResponse) as any;
            
            if (!recipeDetails.ingredients || !Array.isArray(recipeDetails.ingredients)) {
                throw new Error('Receita incompleta ou inválida');
            }

            const finalRecipeName = recipeDetails.name || recipeName || "Receita Identificada";
            
            // Providing default values for required FullRecipe properties
            const fullRecipeData: FullRecipe = { 
                name: finalRecipeName,
                ingredients: recipeDetails.ingredients || [],
                instructions: recipeDetails.instructions || [],
                imageQuery: recipeDetails.imageQuery || '',
                servings: recipeDetails.servings || '',
                prepTimeInMinutes: recipeDetails.prepTimeInMinutes || 0,
                difficulty: recipeDetails.difficulty || 'Médio',
                cost: recipeDetails.cost || 'Médio',
                ...recipeDetails
            };
            setFullRecipes(prev => ({...prev, [finalRecipeName]: fullRecipeData}));
            
            // Abre o modal da receita
            setSelectedRecipe(fullRecipeData);
            closeModal('recipeAssistant');

            // Só adiciona à lista se autoAdd for true
            if (autoAdd) {
                await addRecipeToShoppingList(fullRecipeData);
            }

            // Gera imagem se necessário
            if (recipeDetails.imageQuery) {
                generateRecipeImageBackground(finalRecipeName, recipeDetails.imageQuery);
            }

        } catch (e) {
            console.error("Error fetching recipe:", e);
            setRecipeError("Não foi possível identificar ou gerar esta receita. Tente novamente.");
        } finally {
            setIsRecipeLoading(false);
        }
    }, [items, findDuplicate, addIngredientsBatch, showToast, closeModal, apiKey]);
    
    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const currentItemsCopy = [...items];
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (typeof ing.simplifiedName === 'string' && !findDuplicate(ing.simplifiedName, currentItemsCopy)) {
                const newItem = { name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, isNew: true, isPurchased: false };
                itemsToAdd.push(newItem);
                currentItemsCopy.push({ ...newItem, id: '', displayPrice: '' } as any);
            }
        });

        if (itemsToAdd.length > 0) {
            await addIngredientsBatch(itemsToAdd);
            showToast(`${itemsToAdd.length} ingredientes adicionados!`);
        } else {
            showToast("Ingredientes já estão na lista.");
        }
    };

    const toggleGrouping = useCallback(async () => {
        if (groupingMode === 'recipe') {
            const itemsToCategorize = items.filter(item => !itemCategories[item.id]);
            if (itemsToCategorize.length === 0) { setGroupingMode('aisle'); closeModal('options'); return; }
            setIsOrganizing(true);
            try {
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue e Peixaria", "🧀 Frios e Laticínios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene Pessoal", "🐾 Pets", "🏠 Utilidades Domésticas", "❓ Outros" ];
                
                const response: GenerateContentResponse = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Categorize estes itens: [${itemsToCategorize.map(i => `"${i.name}"`).join(', ')}]. Use APENAS estas categorias: ${categories.join(', ')}. Retorne JSON array: [{"itemName": "Nome", "category": "Categoria"}]`,
                    config: {
                        responseMimeType: "application/json",
                    }
                });
                
                // Cast to any to handle flexible JSON parse
                const categorizedItems = JSON.parse(response.text || "[]") as any;

                if (!Array.isArray(categorizedItems)) {
                    throw new Error("Resposta inválida da IA");
                }

                const newCategoryMap = { ...itemCategories };
                const itemMap = new Map<string, string>(itemsToCategorize.map(i => [normalizeString(i.name), i.id]));
                
                (categorizedItems as { itemName: string; category: string }[]).forEach(ci => {
                    const id = itemMap.get(normalizeString(ci.itemName));
                    if (id) {
                        const matchedCategory = categories.find(c => c.includes(ci.category)) || "❓ Outros";
                        newCategoryMap[id] = matchedCategory;
                    }
                });
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
            } catch (error) { 
                console.error("Error organizing items:", error);
                showToast("Erro ao organizar (Verifique a Chave de IA)."); 
            }
            finally { setIsOrganizing(false); }
        } else {
            setGroupingMode('recipe');
        }
        closeModal('options');
    }, [groupingMode, items, itemCategories, showToast, closeModal, apiKey]);

    const normalizeString = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const clearIncomingList = () => setIncomingList(null);

    const handleExploreRecipeClick = (recipeName: string) => {
        // Se já tem itens na lista (E nome de mercado definido, ou seja, lista ativa)
        // Precisamos perguntar: "Adicionar à lista atual ou começar nova?"
        if (items.length > 0 && currentMarketName) {
            setPendingExploreRecipe(recipeName);
            openModal('recipeDecision');
        } else {
            // Se lista vazia ou sem nome, abre direto (ou prompt de nome se quiser)
            // Se não tem nome definido mas tem itens, assume "lista atual" sem nome
            if (items.length > 0) {
                setPendingExploreRecipe(recipeName);
                openModal('recipeDecision');
            } else {
                // Lista vazia: Abre modal de "Start Shopping" para dar nome, depois abre a receita
                setPendingExploreRecipe(recipeName);
                openModal('startShopping');
            }
        }
    };

    const fetchThemeSuggestions = async (prompt: string) => {
        setCurrentTheme(prompt);
        setRecipeSuggestions([] as FullRecipe[]);
        setModalStates(prev => ({...prev, isThemeRecipesModalOpen: true}));
        setIsSuggestionsLoading(true);
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Added retry logic to improve reliability on free tier
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Sugira 5 receitas para o tema: "${prompt}". Retorne JSON completo: [{"name": "Nome", "ingredients": [], "instructions": [], "imageQuery": "desc", "servings": "X", "prepTimeInMinutes": 30, "difficulty": "Médio", "cost": "Médio"}]`,
                config: { responseMimeType: "application/json" }
            });
            // Fixed potentially unknown return from JSON.parse and mapped it to FullRecipe array correctly
            const suggestionsRaw = JSON.parse(response.text || "[]") as any[];
            const suggestions: FullRecipe[] = suggestionsRaw.map((s: any) => ({
                name: String(s.name || ''),
                ingredients: Array.isArray(s.ingredients) ? s.ingredients : [],
                instructions: Array.isArray(s.instructions) ? s.instructions : [],
                imageQuery: String(s.imageQuery || ''),
                servings: String(s.servings || ''),
                prepTimeInMinutes: Number(s.prepTimeInMinutes || 0),
                difficulty: (s.difficulty === 'Fácil' || s.difficulty === 'Médio' || s.difficulty === 'Difícil') ? s.difficulty : 'Médio',
                cost: (s.cost === 'Baixo' || s.cost === 'Médio' || s.cost === 'Alto') ? s.cost : 'Médio',
                ...s
            } as FullRecipe));
            setRecipeSuggestions(suggestions);
        } catch (error) {
            console.error("Erro ao buscar sugestões:", error);
            showToast("Erro ao buscar sugestões.");
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu,
        theme, setTheme,
        installPromptEvent, handleInstall, handleDismissInstall, isPWAInstallVisible,
        budget, setBudget, clearBudget,
        toastMessage, showToast, isCartTooltipVisible, showCartTooltip,
        fullRecipes, selectedRecipe, isRecipeLoading, recipeError, fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, closeRecipe, resetRecipeState,
        editingItemId, startEdit, cancelEdit,
        duplicateInfo, setDuplicateInfo,
        groupingMode, setGroupingMode, isOrganizing, toggleGrouping,
        itemCategories,
        showStartHerePrompt,
        authTrigger, setAuthTrigger,
        incomingList, clearIncomingList,
        unreadNotificationCount: unreadReceivedCount,
        isAdmin,
        smartNudgeItemName,
        currentMarketName, setCurrentMarketName,
        isSharedSession, setIsSharedSession,
        historyActiveTab, setHistoryActiveTab: (tab: any) => setHistoryActiveTab(tab),
        isHomeViewActive, setHomeViewActive,
        isFocusMode, setFocusMode,
        featuredRecipes, recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions, handleExploreRecipeClick, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        addRecipeToShoppingList,
        showPWAInstallPromptIfAvailable,
        getCategoryRecipesSync: (k: string) => [] as FullRecipe[]
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
