/**
 * =============================================================================
 * REALTIME HOOKS - FlexiTrip PMR
 * =============================================================================
 * Hooks React réutilisables pour Supabase Realtime subscriptions
 * 
 * FONCTIONNALITÉS:
 * - Hook générique useRealtimeSubscription
 * - Hooks spécialisés pour notifications, chat, bagages
 * - Gestion automatique des subscriptions/unsubscriptions
 * - Optimisation des re-renders
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook générique pour s'abonner aux changements d'une table Supabase
 * 
 * @param {string} table - Nom de la table à surveiller
 * @param {Function} callback - Fonction appelée lors des changements
 * @param {Object} options - Options de filtrage et d'événements
 * @param {string} options.event - Type d'événement ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param {Object} options.filter - Filtre PostgreSQL (ex: { column: 'user_id', value: '123' })
 * @param {boolean} options.enabled - Activer/désactiver la souscription (défaut: true)
 * 
 * @example
 * useRealtimeSubscription('notifications', (payload) => {
 *   console.log('Nouvelle notification:', payload.new);
 * }, {
 *   event: 'INSERT',
 *   filter: { column: 'user_id', value: userId },
 *   enabled: !!userId
 * });
 */
export function useRealtimeSubscription(table, callback, options = {}) {
  const {
    event = '*',
    filter = null,
    enabled = true,
  } = options;

  // Utiliser useRef pour éviter les re-subscriptions inutiles
  const channelRef = useRef(null);
  const callbackRef = useRef(callback);

  // Mettre à jour la référence du callback sans déclencher de re-render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !table) {
      return;
    }

    // Nom unique pour le channel
    const channelName = `realtime:${table}:${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Configuration de base
    const config = {
      event,
      schema: 'public',
      table,
    };

    // Ajout du filtre si présent
    if (filter && filter.column && filter.value) {
      config.filter = `${filter.column}=eq.${filter.value}`;
    }

    // Souscription aux changements
    channel.on(
      'postgres_changes',
      config,
      (payload) => {
        callbackRef.current(payload);
      }
    ).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${table}`);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log(`🔌 Unsubscribed from ${table}`);
      }
    };
  }, [table, event, filter?.column, filter?.value, enabled]);
}

/**
 * Hook pour s'abonner aux nouvelles notifications d'un utilisateur
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {Function} onNewNotification - Callback appelé lors d'une nouvelle notification
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeNotifications(user.user_id, (notification) => {
 *   showToast('Nouvelle notification', notification.message);
 *   setUnreadCount(prev => prev + 1);
 * });
 */
export function useRealtimeNotifications(userId, onNewNotification, enabled = true) {
  const handleNotification = useCallback((payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      // Ne notifier que si non lu
      if (!payload.new.lu) {
        onNewNotification(payload.new);
      }
    }
  }, [onNewNotification]);

  useRealtimeSubscription('notifications', handleNotification, {
    event: 'INSERT',
    filter: { column: 'user_id', value: userId },
    enabled: enabled && !!userId,
  });
}

/**
 * Hook pour s'abonner aux nouveaux messages d'une conversation
 * 
 * @param {string} conversationId - ID de la conversation
 * @param {Function} onNewMessage - Callback appelé lors d'un nouveau message
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeChatMessages(conversationId, (message) => {
 *   setMessages(prev => [...prev, message]);
 *   scrollToBottom();
 * });
 */
export function useRealtimeChatMessages(conversationId, onNewMessage, enabled = true) {
  const handleMessage = useCallback((payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      onNewMessage(payload.new);
    }
  }, [onNewMessage]);

  useRealtimeSubscription('chat_messages', handleMessage, {
    event: 'INSERT',
    filter: { column: 'conversation_id', value: conversationId },
    enabled: enabled && !!conversationId,
  });
}

/**
 * Hook pour s'abonner aux événements de bagage (tracking temps réel)
 * 
 * @param {string} bagageId - ID du bagage
 * @param {Function} onNewEvent - Callback appelé lors d'un nouvel événement
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeBagageTracking(bagageId, (event) => {
 *   setTimeline(prev => [...prev, event]);
 *   updateBagageStatus(event.type);
 * });
 */
export function useRealtimeBagageTracking(bagageId, onNewEvent, enabled = true) {
  const handleEvent = useCallback((payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      onNewEvent(payload.new);
    }
  }, [onNewEvent]);

  useRealtimeSubscription('bagage_events', handleEvent, {
    event: 'INSERT',
    filter: { column: 'bagage_id', value: bagageId },
    enabled: enabled && !!bagageId,
  });
}

/**
 * Hook pour s'abonner aux mises à jour de statut d'un voyage
 * 
 * @param {string} voyageId - ID du voyage
 * @param {Function} onStatusChange - Callback appelé lors d'un changement de statut
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeVoyageStatus(voyageId, (voyage) => {
 *   setVoyageStatus(voyage.statut);
 *   if (voyage.statut === 'annule') {
 *     showAlert('Voyage annulé');
 *   }
 * });
 */
export function useRealtimeVoyageStatus(voyageId, onStatusChange, enabled = true) {
  const handleUpdate = useCallback((payload) => {
    if (payload.eventType === 'UPDATE' && payload.new) {
      // Vérifier si le statut a changé
      if (payload.old.statut !== payload.new.statut) {
        onStatusChange(payload.new);
      }
    }
  }, [onStatusChange]);

  useRealtimeSubscription('voyages', handleUpdate, {
    event: 'UPDATE',
    filter: { column: 'voyage_id', value: voyageId },
    enabled: enabled && !!voyageId,
  });
}

/**
 * Hook pour s'abonner aux changements de prise en charge d'un utilisateur PMR
 * 
 * @param {string} userId - ID de l'utilisateur PMR
 * @param {Function} onPriseEnChargeUpdate - Callback appelé lors d'une mise à jour
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimePriseEnCharge(user.user_id, (priseEnCharge) => {
 *   if (priseEnCharge.statut === 'en_cours') {
 *     showNotification('Agent en route');
 *   }
 * });
 */
export function useRealtimePriseEnCharge(userId, onPriseEnChargeUpdate, enabled = true) {
  const handleUpdate = useCallback((payload) => {
    if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
      onPriseEnChargeUpdate(payload.new);
    }
  }, [onPriseEnChargeUpdate]);

  useRealtimeSubscription('prise_en_charge', handleUpdate, {
    event: '*',
    filter: { column: 'user_id', value: userId },
    enabled: enabled && !!userId,
  });
}

/**
 * Hook pour s'abonner aux changements de disponibilité des agents
 * 
 * @param {string} entreprise - Nom de l'entreprise (optionnel)
 * @param {Function} onAgentUpdate - Callback appelé lors d'une mise à jour
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeAgentAvailability('Air France', (agent) => {
 *   updateAgentsList(agent);
 * });
 */
export function useRealtimeAgentAvailability(entreprise, onAgentUpdate, enabled = true) {
  const handleUpdate = useCallback((payload) => {
    if (payload.eventType === 'UPDATE' && payload.new) {
      // Vérifier si la disponibilité a changé
      if (payload.old.disponible !== payload.new.disponible) {
        onAgentUpdate(payload.new);
      }
    }
  }, [onAgentUpdate]);

  const filter = entreprise 
    ? { column: 'entreprise', value: entreprise }
    : null;

  useRealtimeSubscription('agents', handleUpdate, {
    event: 'UPDATE',
    filter,
    enabled: enabled,
  });
}

/**
 * Hook pour écouter les transactions wallet en temps réel
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {Function} onTransaction - Callback appelé lors d'une nouvelle transaction
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimeWalletTransactions(user.user_id, (transaction) => {
 *   updateBalance(transaction.montant, transaction.type);
 *   showToast(`${transaction.type}: ${transaction.montant}€`);
 * });
 */
export function useRealtimeWalletTransactions(userId, onTransaction, enabled = true) {
  const handleTransaction = useCallback((payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      onTransaction(payload.new);
    }
  }, [onTransaction]);

  useRealtimeSubscription('transactions', handleTransaction, {
    event: 'INSERT',
    filter: { column: 'user_id', value: userId },
    enabled: enabled && !!userId,
  });
}

/**
 * Hook pour s'abonner à plusieurs tables simultanément
 * Utile pour les dashboards qui affichent plusieurs sources de données
 * 
 * @param {Array} subscriptions - Tableau de configurations de subscriptions
 * @param {boolean} enabled - Activer/désactiver toutes les subscriptions
 * 
 * @example
 * useMultiRealtimeSubscriptions([
 *   { table: 'notifications', callback: handleNotif, filter: { column: 'user_id', value: userId } },
 *   { table: 'chat_messages', callback: handleMsg, filter: { column: 'conversation_id', value: convId } }
 * ], isActive);
 */
export function useMultiRealtimeSubscriptions(subscriptions = [], enabled = true) {
  useEffect(() => {
    if (!enabled || subscriptions.length === 0) {
      return;
    }

    const channels = subscriptions.map(({ table, callback, event = '*', filter }) => {
      const channelName = `realtime:multi:${table}:${Date.now()}`;
      const channel = supabase.channel(channelName);

      const config = {
        event,
        schema: 'public',
        table,
      };

      if (filter && filter.column && filter.value) {
        config.filter = `${filter.column}=eq.${filter.value}`;
      }

      channel.on('postgres_changes', config, callback).subscribe();

      return channel;
    });

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions, enabled]);
}

/**
 * Hook pour écouter la présence d'utilisateurs (online/offline)
 * Utilise Supabase Presence API
 * 
 * @param {string} channelName - Nom du canal de présence
 * @param {Object} userInfo - Informations de l'utilisateur
 * @param {Function} onPresenceChange - Callback appelé lors de changements
 * @param {boolean} enabled - Activer/désactiver (défaut: true)
 * 
 * @example
 * useRealtimePresence('chat-room-123', 
 *   { user_id: user.user_id, name: user.nom }, 
 *   (presenceState) => {
 *     const onlineUsers = Object.keys(presenceState).length;
 *     setOnlineCount(onlineUsers);
 *   }
 * );
 */
export function useRealtimePresence(channelName, userInfo, onPresenceChange, enabled = true) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!enabled || !channelName || !userInfo) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo.user_id || userInfo.id,
        },
      },
    });

    // Track présence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        onPresenceChange(presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName, userInfo, onPresenceChange, enabled]);
}
