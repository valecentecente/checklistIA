
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';
import type { User, ShoppingItem, AdminInvite } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthLoading: boolean;
    authError: string | null;
    authErrorCode: string | null;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (name: string, username: string, email: string, pass: string, birthDate: string) => Promise<void>;
    updateUserProfile: (name: string, photoURL?: string, birthDate?: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    updateUsername: (newUsername: string) => Promise<void>;
    updateDietaryPreferences: (preferences: string[]) => Promise<void>; 
    removeProfilePhoto: () => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
    loginDemo: () => Promise<void>;
    logout: () => Promise<void>;
    setAuthError: (error: string | null) => void;
    clearAuthError: () => void;
    checkUsernameUniqueness: (username: string) => Promise<boolean>;
    
    // Funções Admin
    pendingAdminInvite: AdminInvite | null;
    sendAdminInvite: (username: string, level: 'admin_l1' | 'admin_l2') => Promise<{ success: boolean; message: string }>;
    respondToAdminInvite: (inviteId: string, accept: boolean) => Promise<void>;
    refreshUserProfile: () => Promise<void>; // NOVO: Permite atualizar permissões sem F5
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
    const [pendingAdminInvite, setPendingAdminInvite] = useState<AdminInvite | null>(null);

    // Verifica se o username já existe no banco de dados público
    const checkUsernameUniqueness = async (username: string): Promise<boolean> => {
        if (!db) return true;
        try {
            const q = query(collection(db, 'users_public'), where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                if (user && user.email) {
                    const docData = querySnapshot.docs[0].data();
                    if (docData.email === user.email) return true;
                }
                return false;
            }
            return true;
        } catch (error) {
            console.error("Erro ao verificar username:", error);
            // Se der erro de permissão aqui (apesar da regra corrigida), permitimos para não travar a UX
            // O backend do Firebase rejeitaria a gravação depois se fosse o caso.
            return true; 
        }
    };

    const generateUniqueUsername = async (baseName: string): Promise<string> => {
        let username = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (username.length < 3) username = username + Math.floor(Math.random() * 1000);
        if (username.length > 15) username = username.substring(0, 15);

        let isUnique = await checkUsernameUniqueness(username);
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const suffix = Math.floor(Math.random() * 10000).toString();
            const availableSpace = 15 - suffix.length;
            const newBase = username.substring(0, availableSpace);
            username = newBase + suffix;
            isUnique = await checkUsernameUniqueness(username);
            attempts++;
        }
        
        if (!isUnique) {
            username = 'user' + Date.now().toString().slice(-8);
        }

        return username;
    };

    const syncUserToPublicDirectory = async (currentUser: any, photoURLOverride?: string, usernameOverride?: string) => {
        if (!db || !currentUser.email) return;
        try {
            const publicUserRef = doc(db, 'users_public', currentUser.email.toLowerCase());
            
            const dataToSync: any = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Usuário',
                photoURL: photoURLOverride || currentUser.photoURL || null,
                email: currentUser.email
            };

            if (usernameOverride) {
                dataToSync.username = usernameOverride.toLowerCase();
            }

            await setDoc(publicUserRef, dataToSync, { merge: true });
        } catch (e) {
            console.error("Erro ao sincronizar diretório público:", e);
        }
    };

    // Função central para processar dados do usuário (Auth + Firestore)
    const processUserData = async (currentUser: any) => {
        let photoToUse = currentUser.photoURL;
        let usernameToUse = null;
        let historyToUse: string[] = [];
        let activeListIdToUse: string = currentUser.uid;
        let preferencesToUse: string[] = []; 
        let birthDateToUse: string | undefined = undefined;
        let roleToUse: 'user' | 'admin_l1' | 'admin_l2' = 'user';

        if (db) {
            try {
                // Busca dados privados
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.photoBase64) photoToUse = data.photoBase64;
                    if (data.usernameChangeHistory) historyToUse = data.usernameChangeHistory;
                    if (data.activeListId) activeListIdToUse = data.activeListId;
                    if (data.dietaryPreferences) preferencesToUse = data.dietaryPreferences;
                    if (data.birthDate) birthDateToUse = data.birthDate;
                    if (data.role) roleToUse = data.role;
                }

                // Busca username
                if (currentUser.email) {
                    const publicUserRef = doc(db, 'users_public', currentUser.email.toLowerCase());
                    const publicUserSnap = await getDoc(publicUserRef);
                    if (publicUserSnap.exists()) {
                        usernameToUse = publicUserSnap.data().username || null;
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar dados do perfil:", e);
                const localPhoto = localStorage.getItem(`user_photo_${currentUser.uid}`);
                if (localPhoto) photoToUse = localPhoto;
            }
        }

        return {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            email: currentUser.email,
            photoURL: photoToUse,
            username: usernameToUse,
            usernameChangeHistory: historyToUse,
            activeListId: activeListIdToUse,
            dietaryPreferences: preferencesToUse,
            birthDate: birthDateToUse,
            role: roleToUse
        };
    };

    // Nova função para atualizar o perfil sem recarregar a página
    const refreshUserProfile = async () => {
        if (!auth?.currentUser) return;
        const updatedUser = await processUserData(auth.currentUser);
        setUser(updatedUser);
    };

    useEffect(() => {
        if (!auth) {
            setIsAuthLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userData = await processUserData(currentUser);
                setUser(userData);
                
                if (userData.username) {
                    syncUserToPublicDirectory(currentUser, userData.photoURL || undefined, userData.username);
                }
            } else {
                setUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !user.username || !db) return;

        const q = query(
            collection(db, 'admin_invites'), 
            where('toUsername', '==', user.username), 
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const inviteData = snapshot.docs[0].data() as AdminInvite;
                setPendingAdminInvite({ ...inviteData, id: snapshot.docs[0].id });
            } else {
                setPendingAdminInvite(null);
            }
        }, (error) => {
            console.warn("Erro ao buscar convites de admin:", error);
        });

        return () => unsubscribe();
    }, [user?.username]);

    const migrateGuestData = async (userId: string) => {
        try {
            const guestItemsJSON = localStorage.getItem('guestShoppingList');
            if (guestItemsJSON && db) {
                const guestItems: ShoppingItem[] = JSON.parse(guestItemsJSON);
                if (guestItems.length > 0) {
                    const batch = writeBatch(db);
                    const itemsCollectionRef = collection(db, `users/${userId}/items`);
                    guestItems.forEach(item => {
                        const { id, ...itemData } = item;
                        batch.set(doc(itemsCollectionRef), itemData);
                    });
                    await batch.commit();
                    localStorage.removeItem('guestShoppingList');
                }
            }
        } catch (e) {
            console.error("Erro ao migrar dados:", e);
        }
    };

    const loginDemo = async () => {
        setAuthError(null);
        setAuthErrorCode(null);
        setIsAuthLoading(true);
        await new Promise(resolve => setTimeout(resolve, 600)); 
        
        setUser({
            uid: 'offline-user-' + Date.now(),
            displayName: 'Convidado',
            email: 'convidado@local.app',
            photoURL: null,
            username: 'convidado',
            activeListId: 'offline-user-' + Date.now(),
            dietaryPreferences: [],
            role: 'admin_l1' 
        });
        setIsAuthLoading(false);
    };

    const getApiKeyDebugInfo = () => {
        // @ts-ignore
        const key = auth?.app?.options?.apiKey || 'N/A';
        if (key && key.length > 10) {
            return `${key.substring(0, 7)}...${key.substring(key.length - 5)}`;
        }
        return key;
    };

    const loginWithEmail = async (email: string, pass: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) {
             setAuthError("Configuração do Firebase ausente.");
             return;
        }

        try {
            const result = await signInWithEmailAndPassword(auth, email, pass);
            localStorage.setItem('remembered_email', email);
            await migrateGuestData(result.user.uid);
        } catch (error: any) {
            console.error("Email Login Error:", error);
            const errorCode = error.code || '';
            const errorMessage = error.message || '';
            
            if (errorCode.includes('api-key-not-valid') || errorMessage.includes('api-key-not-valid')) {
                setAuthErrorCode('API_KEY_ERROR');
                const keyDebug = getApiKeyDebugInfo();
                setAuthError(`Chave Recusada (${keyDebug}). O navegador pode estar usando uma versão antiga.`);
            } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                setAuthError("E-mail ou senha incorretos. Se não tem conta, cadastre-se.");
            } else if (errorCode === 'auth/too-many-requests') {
                setAuthError("Muitas tentativas falhas. Tente novamente mais tarde.");
            } else {
                setAuthError(`Erro ao entrar: ${errorMessage}`);
            }
        }
    };

    const registerWithEmail = async (name: string, username: string, email: string, pass: string, birthDate: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) {
            setAuthError("Configuração do Firebase ausente.");
            return;
        }

        const cleanUsername = username.toLowerCase();

        try {
            const isUnique = await checkUsernameUniqueness(cleanUsername);
            if (!isUnique) {
                setAuthError(`O usuário @${cleanUsername} já está em uso.`);
                return;
            }

            const result = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(result.user, {
                displayName: name
            });
            localStorage.setItem('remembered_email', email);
            
            if (db) {
                const userDocRef = doc(db, 'users', result.user.uid);
                await setDoc(userDocRef, { 
                    birthDate: birthDate,
                    role: 'user' 
                }, { merge: true });
            }

            await syncUserToPublicDirectory({ ...result.user, displayName: name }, undefined, cleanUsername);
            await migrateGuestData(result.user.uid);

            const newUser: User = {
                uid: result.user.uid,
                displayName: name,
                email: result.user.email,
                photoURL: result.user.photoURL,
                username: cleanUsername,
                activeListId: result.user.uid,
                dietaryPreferences: [],
                birthDate: birthDate,
                role: 'user'
            };
            setUser(newUser);

        } catch (error: any) {
            console.error("Registration Error:", error);
            const errorCode = error.code || '';
            const errorMessage = error.message || '';

            if (errorCode.includes('api-key-not-valid')) {
                setAuthErrorCode('API_KEY_ERROR');
                setAuthError(`Chave Recusada. Verifique se confere com o Firebase.`);
            } else if (errorCode === 'auth/email-already-in-use') {
                setAuthError("Este e-mail já está cadastrado. Tente fazer login.");
            } else if (errorCode === 'auth/weak-password') {
                setAuthError("A senha deve ter pelo menos 6 caracteres.");
            } else if (errorCode === 'auth/invalid-email') {
                setAuthError("Formato de e-mail inválido.");
            } else if (errorCode.includes('permission-denied')) {
                setAuthError("Erro de permissão no banco de dados. Tente novamente.");
            } else {
                setAuthError(`Erro ao criar conta (${errorCode}).`);
            }
        }
    };

    const updateUsername = async (newUsername: string) => {
        if (!auth || !auth.currentUser || !user || !db) throw new Error("Usuário não autenticado ou sistema offline.");

        const cleanUsername = newUsername.trim().toLowerCase();
        if (cleanUsername === user.username) return;

        if (!/^[a-z0-9]{3,15}$/.test(cleanUsername)) {
            throw new Error("O nome de usuário deve ter 3 a 15 caracteres, apenas letras minúsculas e números.");
        }

        const LIMIT_CHANGES = 2;
        const DAYS_WINDOW = 15;
        const history = user.usernameChangeHistory || [];
        const now = new Date();
        const windowStart = new Date(now.getTime() - (DAYS_WINDOW * 24 * 60 * 60 * 1000));

        const recentChanges = history.filter(dateStr => new Date(dateStr) > windowStart);

        if (recentChanges.length >= LIMIT_CHANGES) {
            throw new Error(`Limite de alterações atingido (máx. 2 a cada 15 dias).`);
        }

        try {
            const isUnique = await checkUsernameUniqueness(cleanUsername);
            if (!isUnique) {
                throw new Error(`O usuário @${cleanUsername} já está em uso.`);
            }

            await syncUserToPublicDirectory(auth.currentUser, undefined, cleanUsername);
            
            const newHistory = [...history, now.toISOString()];
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, { usernameChangeHistory: newHistory }, { merge: true });

            setUser(prev => prev ? ({ ...prev, username: cleanUsername, usernameChangeHistory: newHistory }) : null);

        } catch (error: any) {
            console.error("Erro ao atualizar username:", error);
            throw new Error(error.message || "Falha ao atualizar nome de usuário.");
        }
    };

    const updateDietaryPreferences = async (preferences: string[]) => {
        if (!auth || !auth.currentUser || !db) throw new Error("Usuário não autenticado.");
        
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, { dietaryPreferences: preferences }, { merge: true });
            setUser(prev => prev ? ({ ...prev, dietaryPreferences: preferences }) : null);
        } catch (error: any) {
            console.error("Erro ao salvar preferências:", error);
            throw new Error("Falha ao salvar preferências.");
        }
    };

    const deleteAccount = async (password: string) => {
        if (!auth || !auth.currentUser || !auth.currentUser.email || !db) throw new Error("Erro de autenticação.");

        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, credential);

            const uid = auth.currentUser.uid;
            const email = auth.currentUser.email;

            await deleteDoc(doc(db, 'users_public', email.toLowerCase()));
            await deleteDoc(doc(db, 'users', uid));
            await deleteUser(auth.currentUser);

            setUser(null);
            
        } catch (error: any) {
            console.error("Erro ao excluir conta:", error);
            if (error.code === 'auth/wrong-password') {
                throw new Error("Senha incorreta.");
            }
            throw new Error("Erro ao excluir conta: " + error.message);
        }
    };

    const updateUserProfile = async (name: string, photoURL?: string, birthDate?: string) => {
        if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
        
        try {
            await updateProfile(auth.currentUser, { displayName: name });

            if (db) {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                const updates: any = {};
                
                if (photoURL) {
                    updates.photoBase64 = photoURL;
                    localStorage.setItem(`user_photo_${auth.currentUser.uid}`, photoURL);
                }
                
                if (birthDate) {
                    updates.birthDate = birthDate;
                }

                if (Object.keys(updates).length > 0) {
                    await setDoc(userDocRef, updates, { merge: true });
                }
            }

            await syncUserToPublicDirectory(auth.currentUser, photoURL, user?.username || undefined);
            
            setUser(prev => prev ? ({ 
                ...prev, 
                displayName: name, 
                photoURL: photoURL || prev.photoURL,
                birthDate: birthDate || prev.birthDate
            }) : null);
            
        } catch (error: any) {
            console.error("Erro ao atualizar perfil:", error);
            throw new Error("Falha ao atualizar perfil: " + error.message);
        }
    };

    const removeProfilePhoto = async () => {
        if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");

        try {
            await updateProfile(auth.currentUser, { photoURL: "" });

            if (db) {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await setDoc(userDocRef, { photoBase64: null }, { merge: true });
            }
            
            localStorage.removeItem(`user_photo_${auth.currentUser.uid}`);
            await syncUserToPublicDirectory(auth.currentUser, "", user?.username || undefined);
            setUser(prev => prev ? ({ ...prev, photoURL: null }) : null);

        } catch (error: any) {
            console.error("Erro ao remover foto:", error);
            throw new Error("Falha ao remover foto: " + error.message);
        }
    };

    const updateUserPassword = async (currentPass: string, newPass: string) => {
        if (!auth || !auth.currentUser || !auth.currentUser.email) throw new Error("Usuário não autenticado.");
        
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPass);
        } catch (error: any) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                throw new Error("A senha atual está incorreta.");
            }
            if (error.code === 'auth/too-many-requests') {
                throw new Error("Muitas tentativas. Aguarde um momento.");
            }
            throw new Error("Erro ao mudar senha: " + error.message);
        }
    };

    const login = async () => {
        setAuthError(null);
        setAuthErrorCode(null);
        
        if (!isFirebaseConfigured || !auth) {
            setAuthError("Sistema de login indisponível no momento.");
            return;
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const result = await signInWithPopup(auth, provider);
            
            let finalUsername = undefined;
            if (db && result.user.email) {
                const publicUserRef = doc(db, 'users_public', result.user.email.toLowerCase());
                const publicUserSnap = await getDoc(publicUserRef);
                
                if (!publicUserSnap.exists()) {
                    const baseName = result.user.email.split('@')[0];
                    finalUsername = await generateUniqueUsername(baseName);
                }
            }

            await migrateGuestData(result.user.uid);
            await syncUserToPublicDirectory(result.user, undefined, finalUsername);
        } catch (error: any) {
            console.error("Google Login Error:", error);
            const errorCode = error.code || '';
            const errorMessage = error.message || '';
            
            if (errorCode === 'auth/popup-closed-by-user') return;
            
            if (errorCode.includes('api-key-not-valid')) {
                setAuthErrorCode('API_KEY_ERROR');
                setAuthError(`Chave Recusada. Verifique se confere com o painel.`);
            } else if (errorCode === 'auth/unauthorized-domain') {
                 // CAPTURA DO ERRO DE DOMÍNIO PARA A UI MOSTRAR O POPUP
                 const domain = window.location.hostname;
                 console.warn(`Blocking domain: ${domain}`);
                 setAuthErrorCode('DOMAIN_ERROR');
                 setAuthError(`Domínio não autorizado: ${domain}`);
            } else {
                setAuthError(`Erro Google: ${errorMessage}`);
                setAuthErrorCode('GOOGLE_ERROR');
            }
        }
    };

    const logout = async () => {
        if (!auth || !isFirebaseConfigured) {
            setUser(null);
            return;
        }
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Logout Error:", error);
            setUser(null);
        }
    };

    const clearAuthError = () => {
        setAuthError(null);
        setAuthErrorCode(null);
    }

    const sendAdminInvite = async (username: string, level: 'admin_l1' | 'admin_l2') => {
        if (!db || !user) return { success: false, message: 'Erro interno.' };
        
        try {
            const q = query(collection(db, 'users_public'), where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, message: 'Usuário não encontrado.' };
            }

            const targetUser = querySnapshot.docs[0].data();
            if (targetUser.uid === user.uid) {
                return { success: false, message: 'Você não pode convidar a si mesmo.' };
            }

            await addDoc(collection(db, 'admin_invites'), {
                fromUid: user.uid,
                fromName: user.displayName,
                toUsername: username.toLowerCase(),
                level: level,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            return { success: true, message: `Convite enviado para @${username}` };

        } catch (error) {
            console.error("Erro ao enviar convite admin:", error);
            return { success: false, message: 'Falha ao enviar convite.' };
        }
    };

    const respondToAdminInvite = async (inviteId: string, accept: boolean) => {
        if (!db || !user) return;
        
        try {
            const inviteRef = doc(db, 'admin_invites', inviteId);
            const inviteSnap = await getDoc(inviteRef);
            
            if (inviteSnap.exists()) {
                const inviteData = inviteSnap.data() as AdminInvite;
                
                if (accept) {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { role: inviteData.level });
                    // Não precisa atualizar o user state manualmente se usar o refreshUserProfile
                }

                await updateDoc(inviteRef, { status: accept ? 'accepted' : 'rejected' });
            }
            
            setPendingAdminInvite(null); 
        } catch (error) {
            console.error("Erro ao responder convite:", error);
        }
    };

    const value = { 
        user, 
        isAuthLoading, 
        authError, 
        authErrorCode, 
        login, 
        loginWithEmail, 
        registerWithEmail, 
        updateUserProfile, 
        updateUserPassword, 
        updateUsername, 
        updateDietaryPreferences,
        removeProfilePhoto,
        deleteAccount,
        loginDemo, 
        logout, 
        setAuthError, 
        clearAuthError,
        checkUsernameUniqueness,
        pendingAdminInvite,
        sendAdminInvite,
        respondToAdminInvite,
        refreshUserProfile // Expoe a nova função
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
