/**
 * =============================================================================
 * AUTH CONTEXT - FlexiTrip PMR (Supabase Edition)
 * =============================================================================
 * Gestion de l'authentification via Supabase Auth + Edge Functions
 * 
 * FONCTIONNALITÉS:
 * - Login/Logout/Signup via Edge Functions
 * - Session persistante automatique (Supabase Auth)
 * - Récupération automatique des données utilisateur complètes
 * - Mise à jour du profil utilisateur
 * - Compatible avec tous les composants existants
 * 
 * MIGRATION:
 * - Remplace l'ancien système JWT custom + axios
 * - Compatible avec l'interface existante (login, logout, signup, user, loading)
 * - Les composants existants continuent de fonctionner sans modification
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { supabase, callEdgeFunction } from '../config/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // État utilisateur complet (depuis Edge Function user-operations)
    const [loading, setLoading] = useState(true); // État de chargement
    const [session, setSession] = useState(null); // Session Supabase (JWT)

    /**
     * Récupère les données utilisateur complètes depuis la Edge Function
     * Appelé après login réussi ou au démarrage si session existe
     */
    const fetchUserData = useCallback(async (userId) => {
        try {
            const { data, error } = await callEdgeFunction(
                'user-operations',
                `/users/${userId}`
            );

            if (error) {
                console.error('Erreur récupération utilisateur:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Exception fetchUserData:', err);
            return null;
        }
    }, []);

    /**
     * Initialisation: Récupère la session existante et écoute les changements
     */
    useEffect(() => {
        // Récupération de la session existante
        const initAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession) {
                    setSession(currentSession);
                    
                    // Récupérer les données utilisateur complètes
                    const userData = await fetchUserData(currentSession.user.id);
                    setUser(userData);
                } else {
                    setUser(null);
                    setSession(null);
                }
            } catch (error) {
                console.error('Erreur initialisation auth:', error);
                setUser(null);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Écoute des changements d'authentification (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log('🔐 Auth event:', event);

                setSession(newSession);

                if (newSession) {
                    // Utilisateur connecté: récupérer les données complètes
                    const userData = await fetchUserData(newSession.user.id);
                    setUser(userData);
                } else {
                    // Utilisateur déconnecté
                    setUser(null);
                }

                setLoading(false);
            }
        );

        // Cleanup
        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUserData]);

    /**
     * CONNEXION - Appel à la Edge Function auth-operations
     * Compatible avec l'interface existante
     * 
     * @param {Object} credentials - { email, password }
     * @returns {Promise<Object>} Données utilisateur
     */
    const login = async (credentials) => {
        try {
            // Appel à la Edge Function auth-operations
            const { data, error } = await callEdgeFunction('auth-operations', '/auth/login', {
                method: 'POST',
                body: credentials,
            });

            if (error) {
                console.error('Erreur login:', error);
                throw new Error("Identifiants invalides. Veuillez réessayer.");
            }

            if (!data || !data.user) {
                throw new Error("Erreur de connexion. Veuillez réessayer plus tard.");
            }

            // Mise à jour de l'état
            setUser(data.user);
            
            // Note: Le JWT est automatiquement géré par Supabase Auth
            // Pas besoin de localStorage.setItem('token', ...)

            return data.user;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    };

    /**
     * DÉCONNEXION - Logout Supabase + nettoyage
     */
    const logout = async () => {
        try {
            // Appel à la Edge Function auth-operations (optionnel, pour logs côté serveur)
            await callEdgeFunction('auth-operations', '/auth/logout', {
                method: 'POST',
            });

            // Déconnexion Supabase
            await supabase.auth.signOut();

            // Nettoyage de l'état
            setUser(null);
            setSession(null);
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // Forcer le nettoyage même en cas d'erreur
            setUser(null);
            setSession(null);
        }
    };

    /**
     * INSCRIPTION - Création d'un nouveau compte
     * 
     * @param {Object} credentials - Données du nouvel utilisateur
     * @returns {Promise<Object>} Données utilisateur créé
     */
    const signup = async (credentials) => {
        try {
            // Appel à la Edge Function user-operations
            const { data, error } = await callEdgeFunction('user-operations', '/users/insert', {
                method: 'POST',
                body: credentials,
            });

            if (error) {
                console.error('Erreur signup:', error);
                throw new Error(error.message || "Erreur lors de l'inscription.");
            }

            // Connexion automatique après inscription
            if (data && credentials.email && credentials.mot_de_passe) {
                await login({
                    email: credentials.email,
                    password: credentials.mot_de_passe,
                });
            }

            return data;
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            throw error;
        }
    };

    /**
     * RÉCUPÉRATION UTILISATEUR PAR ID
     * 
     * @param {string} id - ID de l'utilisateur
     * @returns {Promise<Object>} Données utilisateur
     */
    const getUserById = async (id) => {
        try {
            const { data, error } = await callEdgeFunction(
                'user-operations',
                `/users/${id}`
            );

            if (error) {
                console.error(`Erreur récupération user ${id}:`, error);
                if (error.status === 404) {
                    throw new Error('Utilisateur non trouvé.');
                }
                throw new Error('Erreur lors de la récupération des données utilisateur.');
            }

            return data;
        } catch (error) {
            console.error(`Erreur getUserById(${id}):`, error);
            throw error;
        }
    };

    /**
     * MISE À JOUR DU PROFIL UTILISATEUR
     * 
     * @param {Object} updates - Données à mettre à jour
     * @returns {Promise<Object>} Données utilisateur mises à jour
     */
    const updateUserProfile = async (updates) => {
        try {
            if (!user || !user.user_id) {
                throw new Error('Utilisateur non authentifié');
            }

            // S'assurer que l'ID est présent
            const userId = updates.user_id || user.user_id;

            // Appel à la Edge Function user-operations
            const { data, error } = await callEdgeFunction(
                'user-operations',
                `/users/${userId}`,
                {
                    method: 'PUT',
                    body: updates,
                }
            );

            if (error) {
                console.error('Erreur mise à jour profil:', error);
                throw new Error(error.message || 'Erreur lors de la mise à jour du profil');
            }

            // Mise à jour locale de l'utilisateur
            setUser((prevUser) => ({
                ...prevUser,
                ...data,
            }));

            return data;
        } catch (error) {
            console.error('Erreur updateUserProfile:', error);
            throw error;
        }
    };

    /**
     * KAFKA CONSUMER - DEPRECATED
     * Conservé pour compatibilité mais non utilisé avec Supabase
     * Utiliser Supabase Realtime à la place
     */
    const startKafkaConsumer = async (onMessage, onError) => {
        console.warn('⚠️ startKafkaConsumer est deprecated. Utilisez Supabase Realtime.');
        if (onError) {
            onError('Kafka n\'est plus utilisé avec Supabase. Utilisez Realtime.');
        }
    };

    // Fournir les valeurs via le contexte
    const value = React.useMemo(
        () => ({
            user,
            session,
            login,
            logout,
            signup,
            updateUserProfile,
            getUserById,
            startKafkaConsumer, // Deprecated mais conservé pour compatibilité
            loading,
        }),
        [user, session, loading]
    );

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div>Chargement...</div> : children}
        </AuthContext.Provider>
    );
};









