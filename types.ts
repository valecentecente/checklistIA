
export interface ShoppingItem {
  id: string;
  name: string;
  displayPrice: string;
  calculatedPrice: number;
  details: string;
  recipeName?: string | null;
  isNew?: boolean;
  isPurchased: boolean;
  
  // NOVOS CAMPOS PARA ATRIBUIÇÃO (Criador)
  creatorUid?: string | null;
  creatorDisplayName?: string | null;
  creatorPhotoURL?: string | null;
  listId?: string | null;

  // NOVOS CAMPOS PARA DELEGAÇÃO (Responsável)
  responsibleUid?: string | null;
  responsibleDisplayName?: string | null;
}

export interface DuplicateInfo {
  newItemName: string;
  existingItem: ShoppingItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface RecipeDetails {
  ingredients: {
    simplifiedName: string;
    detailedName: string;
  }[];
  instructions: string[];
  imageQuery: string;
  servings: string;
  prepTimeInMinutes: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  cost: 'Baixo' | 'Médio' | 'Alto';
}

export interface FullRecipe {
  name: string;
  ingredients: {
    simplifiedName: string;
    detailedName: string;
  }[];
  instructions: string[];
  imageQuery: string;
  servings: string;
  prepTimeInMinutes: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  cost: 'Baixo' | 'Médio' | 'Alto';
  imageUrl?: string;
  imageSource?: 'cache' | 'genai';
  description?: string;
  keywords?: string[]; // Indexação para busca rápida
  tags?: string[]; // Categorização (ex: sobremesa, fit, vegano)
  isAlcoholic?: boolean; // NOVO: Classificação +18
}

export interface RecipeSuggestion {
  name: string;
  description: string;
  imageQuery: string;
}

export interface HistoricItem {
  name: string;
  displayPrice: string;
  calculatedPrice: number;
  details: string;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  marketName: string;
  total: number;
  items: HistoricItem[];
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  username: string | null;
  usernameChangeHistory?: string[]; // Lista de datas ISO das últimas alterações
  activeListId?: string; // ID da lista que o usuário deve ler (pode ser o próprio UID ou de outro usuário)
  dietaryPreferences?: string[]; // NOVO: Preferências para o algoritmo (ex: ['vegan', 'fitness'])
  birthDate?: string; // Data de nascimento YYYY-MM-DD
  role?: 'user' | 'admin_l1' | 'admin_l2'; // NOVO: Role administrativa
}

export interface AuthorMetadata {
  uid: string;
  displayName: string;
  photoURL: string | null;
  username: string | null;
}

export interface ReceivedListRecord {
  id: string;
  date: string;
  shareId: string;
  marketName: string;
  itemCount: number;
  author: AuthorMetadata;
  items?: HistoricItem[];
  read?: boolean; // NOVO: Status de leitura (false por padrão)
}

export interface StartShoppingData {
  marketName: string;
  isShared: boolean;
}

export interface Offer {
    id: string;
    name: string;
    price: string;
    oldPrice?: string;
    image: string; // Mantido como "capa"
    images?: string[]; // NOVO: Array de imagens para carrossel
    store: string;
    category: string;
    link: string;
    discount?: string;
    tags?: string[]; // NOVO: Tags para match contextual
    description?: string; // NOVO: Descrição detalhada do produto
    averageRating?: number; // NOVO: Média de estrelas (1-5)
    reviewCount?: number; // NOVO: Total de avaliações
    createdAt?: any;
}

export interface Review {
    id: string;
    offerId: string;
    offerName?: string; // Snapshot do nome do produto
    offerImage?: string; // Snapshot da imagem do produto
    userId: string;
    userName: string;
    userPhotoURL?: string | null;
    rating: number;
    comment: string;
    createdAt: any;
}

export interface AdminInvite {
    id: string;
    fromUid: string;
    fromName: string;
    toUsername: string;
    level: 'admin_l1' | 'admin_l2';
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string | null;
    actionType: 'create' | 'update' | 'delete' | 'login';
    targetName: string; // Nome do produto ou objeto afetado
    details?: string;
    timestamp: any;
}