/**
 * =============================================================================
 * CONFIGURATION SUPABASE CLIENT - FlexiTrip PMR
 * =============================================================================
 * Ce fichier configure le client Supabase unique pour toute l'application.
 * Il remplace l'ancienne configuration axios avec des appels directs aux
 * Edge Functions Supabase.
 * 
 * FONCTIONNALITÉS:
 * - Client Supabase unique (singleton)
 * - Gestion automatique de l'authentification JWT
 * - Realtime pour notifications, chat, tracking
 * - Edge Functions pour toute la logique métier
 * - Storage pour les photos et documents
 * 
 * VARIABLES D'ENVIRONNEMENT REQUISES:
 * - REACT_APP_SUPABASE_URL: URL de votre projet Supabase
 * - REACT_APP_SUPABASE_ANON_KEY: Clé anonyme/publique Supabase
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// =============================================================================

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Configuration Supabase manquante!\n\n' +
    'Les variables d\'environnement suivantes sont requises:\n' +
    '  - REACT_APP_SUPABASE_URL\n' +
    '  - REACT_APP_SUPABASE_ANON_KEY\n\n' +
    'Créez un fichier .env à la racine de flexitrip/ en copiant .env.example\n' +
    'et remplissez-le avec vos credentials Supabase.\n'
  );
  throw new Error('Configuration Supabase manquante');
}

// =============================================================================
// CRÉATION DU CLIENT SUPABASE
// =============================================================================

/**
 * Client Supabase unique pour toute l'application
 * 
 * Options de configuration:
 * - auth.autoRefreshToken: Rafraîchit automatiquement le JWT avant expiration
 * - auth.persistSession: Persiste la session dans localStorage
 * - auth.detectSessionInUrl: Détecte les tokens dans l'URL (OAuth, magic links)
 * - realtime: Configuration WebSocket pour les subscriptions temps réel
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Stockage de la session
  },
  realtime: {
    // Configuration WebSocket pour Supabase Realtime
    params: {
      eventsPerSecond: 10, // Limite de débit pour éviter la surcharge
    },
  },
  global: {
    headers: {
      'x-application-name': 'FlexiTrip-PMR',
    },
  },
});

// =============================================================================
// HELPER: APPEL AUX EDGE FUNCTIONS
// =============================================================================

/**
 * Helper pour appeler les Edge Functions Supabase de manière uniforme
 * 
 * @param {string} functionName - Nom de la Edge Function (ex: 'auth-operations')
 * @param {string} path - Chemin de l'endpoint (ex: '/auth/login')
 * @param {Object} options - Options de la requête
 * @param {string} options.method - Méthode HTTP (GET, POST, PUT, DELETE)
 * @param {Object} [options.body] - Corps de la requête (sera JSONifié)
 * @param {Object} [options.headers] - Headers additionnels
 * @returns {Promise<{data: any, error: any}>}
 * 
 * @example
 * // Appel simple GET
 * const { data, error } = await callEdgeFunction('user-operations', '/users/123');
 * 
 * @example
 * // Appel POST avec body
 * const { data, error } = await callEdgeFunction('auth-operations', '/auth/login', {
 *   method: 'POST',
 *   body: { email, password }
 * });
 */
export async function callEdgeFunction(functionName, path, options = {}) {
  try {
    const { method = 'GET', body, headers = {} } = options;

    // Construction de l'URL complète avec le path
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    
    // Préparation des headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-path': fullPath, // Passer le path dans un header custom
      ...headers,
    };

    // Ajout du token JWT si l'utilisateur est connecté
    const session = await supabase.auth.getSession();
    if (session?.data?.session?.access_token) {
      requestHeaders['Authorization'] = `Bearer ${session.data.session.access_token}`;
    }

    // Préparation du body (ajouter le path et la méthode pour routage)
    const requestBody = {
      path: fullPath,
      method,
      ...(body || {}),
    };

    // Appel à la Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: requestBody,
      headers: requestHeaders,
    });

    // Gestion des erreurs
    if (error) {
      console.error(`❌ Erreur Edge Function ${functionName}${fullPath}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`❌ Exception lors de l'appel à ${functionName}${path}:`, err);
    return { data: null, error: err };
  }
}

// =============================================================================
// HELPERS: REALTIME SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe aux changements d'une table Supabase
 * 
 * @param {string} table - Nom de la table
 * @param {Function} callback - Fonction appelée lors des changements
 * @param {Object} filter - Filtre optionnel (ex: { user_id: 'eq.123' })
 * @returns {Object} Subscription object (utilisez .unsubscribe() pour arrêter)
 * 
 * @example
 * // Écouter les nouvelles notifications
 * const subscription = subscribeToTable('notifications', (payload) => {
 *   console.log('Nouvelle notification:', payload.new);
 * }, { user_id: 'eq.123' });
 * 
 * // Arrêter l'écoute
 * subscription.unsubscribe();
 */
export function subscribeToTable(table, callback, filter = {}) {
  let channel = supabase.channel(`realtime:${table}`);

  // Application des filtres
  let query = channel.on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table,
    ...filter,
  }, callback);

  return query.subscribe();
}

/**
 * Subscribe aux nouveaux messages d'une conversation de chat
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {Function} callback - Fonction appelée lors d'un nouveau message
 * @returns {Object} Subscription object
 */
export function subscribeToChatMessages(conversationId, callback) {
  return subscribeToTable(
    'chat_messages',
    (payload) => {
      if (payload.eventType === 'INSERT') {
        callback(payload.new);
      }
    },
    { conversation_id: `eq.${conversationId}` }
  );
}

/**
 * Subscribe aux notifications non lues d'un utilisateur
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {Function} callback - Fonction appelée lors d'une nouvelle notification
 * @returns {Object} Subscription object
 */
export function subscribeToNotifications(userId, callback) {
  return subscribeToTable(
    'notifications',
    (payload) => {
      if (payload.eventType === 'INSERT' && !payload.new.lu) {
        callback(payload.new);
      }
    },
    { user_id: `eq.${userId}` }
  );
}

/**
 * Subscribe aux événements de bagage (tracking temps réel)
 * 
 * @param {string} bagageId - ID du bagage
 * @param {Function} callback - Fonction appelée lors d'un nouvel événement
 * @returns {Object} Subscription object
 */
export function subscribeToBagageEvents(bagageId, callback) {
  return subscribeToTable(
    'bagage_events',
    (payload) => {
      if (payload.eventType === 'INSERT') {
        callback(payload.new);
      }
    },
    { bagage_id: `eq.${bagageId}` }
  );
}

// =============================================================================
// HELPERS: STORAGE
// =============================================================================

/**
 * Upload un fichier dans Supabase Storage
 * 
 * @param {string} bucket - Nom du bucket ('avatars', 'documents', etc.)
 * @param {string} filePath - Chemin du fichier dans le bucket
 * @param {File|Blob} file - Fichier à uploader
 * @returns {Promise<{data: any, error: any}>}
 * 
 * @example
 * const { data, error } = await uploadFile(
 *   'avatars',
 *   `${userId}/profile.jpg`,
 *   fileBlob
 * );
 */
export async function uploadFile(bucket, filePath, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Remplace si le fichier existe déjà
    });

  if (error) {
    console.error(`❌ Erreur upload ${bucket}/${filePath}:`, error);
    return { data: null, error };
  }

  // Génération de l'URL publique
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
}

/**
 * Récupère l'URL publique d'un fichier
 * 
 * @param {string} bucket - Nom du bucket
 * @param {string} filePath - Chemin du fichier
 * @returns {string} URL publique
 */
export function getFileUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default supabase;

// Log de confirmation
console.log('✅ Client Supabase initialisé:', {
  url: supabaseUrl,
  features: [
    'Authentication',
    'Edge Functions',
    'Realtime',
    'Storage',
  ],
});
