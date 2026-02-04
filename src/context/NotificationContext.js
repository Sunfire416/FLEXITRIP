/**
 * =============================================================================
 * NOTIFICATION CONTEXT - FlexiTrip PMR (Supabase Realtime Edition)
 * =============================================================================
 * Gestion des notifications avec Supabase Realtime (temps réel)
 * 
 * FONCTIONNALITÉS:
 * - Notifications temps réel via Supabase Realtime (pas de polling)
 * - Compteur non lues en temps réel
 * - Marquage lu/non lu avec sync automatique
 * - Toast notifications automatiques
 * - État global partagé dans l'application
 * 
 * MIGRATION:
 * - Remplace l'ancien système de polling axios (10 secondes)
 * - Réception instantanée des notifications (< 100ms)
 * - Réduit la charge serveur (pas de polling)
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import * as api from '../services/api';
import { useRealtimeNotifications } from '../hooks/useRealtime';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Récupérer notifications initiales depuis API
   */
  const fetchNotifications = useCallback(async () => {
    if (!user?.user_id) return;

    setLoading(true);
    try {
      const data = await api.getNotificationsByUser(user.user_id);
      setNotifications(data.notifications || data);
      
      // Calculer le nombre de non lues
      const unread = data.notifications 
        ? data.notifications.filter(n => !n.lu).length
        : data.filter(n => !n.lu).length;
      
      setUnreadCount(unread);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur fetch notifications:', err);
      setError('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Récupérer uniquement le compteur (plus rapide)
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const data = await api.getUnreadCount(user.user_id);
      setUnreadCount(data.unread_count || data.count || 0);
    } catch (err) {
      console.error('❌ Erreur fetch count:', err);
    }
  }, [user]);

  /**
   * Gestionnaire de nouvelles notifications temps réel
   * Appelé automatiquement par le hook Realtime
   */
  const handleNewNotification = useCallback((notification) => {
    console.log('🔔 Nouvelle notification temps réel:', notification);

    // Ajouter la notification en haut de la liste
    setNotifications(prev => [notification, ...prev]);

    // Incrémenter le compteur si non lue
    if (!notification.lu) {
      setUnreadCount(prev => prev + 1);
    }

    // Afficher une toast notification (optionnel)
    showToastNotification(notification);
  }, []);

  /**
   * Afficher une notification toast dans l'UI
   */
  const showToastNotification = (notification) => {
    // Si l'API Notifications du navigateur est disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.titre || 'FlexiTrip', {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.notification_id,
      });
    }

    // Vous pouvez aussi utiliser une librairie de toast comme react-hot-toast
    // toast.success(notification.message);
  };

  /**
   * Demander la permission pour les notifications du navigateur
   */
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
    }
  };

  /**
   * Marquer notification comme lue
   */
  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationAsRead(notificationId);

      // Mettre à jour état local
      setNotifications(prev =>
        prev.map(notif =>
          notif.notification_id === notificationId
            ? { ...notif, lu: true, date_lecture: new Date().toISOString() }
            : notif
        )
      );

      // Décrémenter le compteur
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('❌ Erreur mark read:', err);
    }
  };

  /**
   * Marquer toutes comme lues
   */
  const markAllAsRead = async () => {
    if (!user?.user_id) return;

    try {
      await api.markAllNotificationsAsRead(user.user_id);

      // Mettre à jour état local
      setNotifications(prev =>
        prev.map(notif => ({ 
          ...notif, 
          lu: true, 
          date_lecture: new Date().toISOString() 
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('❌ Erreur mark all read:', err);
    }
  };

  /**
   * Supprimer notification
   */
  const deleteNotification = async (notificationId) => {
    try {
      await api.deleteNotification(notificationId);

      // Vérifier si la notification était non lue
      const notif = notifications.find(n => n.notification_id === notificationId);
      const wasUnread = notif && !notif.lu;

      // Retirer de l'état local
      setNotifications(prev =>
        prev.filter(notif => notif.notification_id !== notificationId)
      );

      // Mettre à jour count si non lue
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('❌ Erreur suppression notification:', err);
    }
  };

  /**
   * Supprimer toutes les notifications
   */
  const clearAllNotifications = async () => {
    if (!user?.user_id) return;

    try {
      await api.clearAllNotifications(user.user_id);

      // Vider l'état local
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('❌ Erreur clear all:', err);
    }
  };

  /**
   * Forcer refresh notifications
   */
  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Chargement initial des notifications
  useEffect(() => {
    if (user?.user_id) {
      fetchNotifications();
      requestNotificationPermission();
    }
  }, [user, fetchNotifications]);

  // Subscription Realtime aux nouvelles notifications
  useRealtimeNotifications(
    user?.user_id,
    handleNewNotification,
    !!user?.user_id // Activé seulement si user connecté
  );

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
    requestNotificationPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook custom pour utiliser le contexte
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
