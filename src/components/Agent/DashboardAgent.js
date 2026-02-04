import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

function DashboardAgent() {
  const [agent, setAgent] = useState(null);
  const [reservationsPmr, setReservationsPmr] = useState([]);
  const [priseEnCours, setPriseEnCours] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAgent();
    loadReservationsPmr();
  }, []);

  useEffect(() => {
    if (agent) {
      loadNotifications();
      // Polling toutes les 10 secondes
      const interval = setInterval(() => {
        loadNotifications();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [agent]);

  const loadAgent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('agents_pmr')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setAgent(data);
  };

  const loadReservationsPmr = async () => {
    // Charger toutes les réservations PMR non terminées
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles(*),
        etapes(*),
        enregistrements(*),
        prises_en_charge(*)
      `)
      .eq('assistance_pmr', true)
      .in('statut', ['confirmee', 'en_cours'])
      .order('date_depart', { ascending: true });

    console.log('Réservations PMR chargées:', data, error);
    setReservationsPmr(data || []);
    
    // Vérifier si une prise en charge est en cours
    const { data: { user } } = await supabase.auth.getUser();
    const { data: agentData } = await supabase
      .from('agents_pmr')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agentData) {
      const { data: currentPrise } = await supabase
        .from('prises_en_charge')
        .select('*, reservations(*, profiles(*))')
        .eq('agent_pmr_id', agentData.id)
        .eq('statut', 'en_cours')
        .single();

      setPriseEnCours(currentPrise);
    }
    
    setLoading(false);
  };

  const loadNotifications = async () => {
    if (!agent) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('agent_pmr_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications(data || []);
  };

  const handleMarkAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('id', notificationId);

    await loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('agent_pmr_id', agent.id)
      .eq('lue', false);

    await loadNotifications();
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.lue).length;
  };

  const getNotifIcon = (type) => {
    const icons = {
      'passager_enregistre': '✈️',
      'passager_arrive': '📍',
      'assistance_demarree': '🚀',
      'assistance_terminee': '✅',
      'bagage_scanne': '📦',
      'verification_faciale': '🔍',
    };
    return icons[type] || '📬';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDebutPriseEnCharge = (reservationId) => {
    navigate(`/prise-en-charge/${reservationId}`);
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR - Agent</h1>
        <div style={styles.navRight}>
          <div style={styles.notificationBtn} onClick={() => setShowNotifications(!showNotifications)}>
            🔔 Notifications
            {getUnreadCount() > 0 && (
              <span style={styles.notificationBadge}>{getUnreadCount()}</span>
            )}
          </div>
          <span style={styles.userName}>
            {agent?.type_agent.replace('_', ' ').toUpperCase()} - {agent?.prenom} {agent?.nom}
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
        </div>
      </nav>

      {/* Panel notifications */}
      {showNotifications && (
        <div style={styles.notificationsPanel}>
          <div style={styles.notificationsPanelHeader}>
            <h3>🔔 Notifications ({getUnreadCount()} non lues)</h3>
            <div>
              {getUnreadCount() > 0 && (
                <button onClick={handleMarkAllAsRead} style={styles.markAllBtn}>
                  ✓ Tout marquer comme lu
                </button>
              )}
              <button onClick={() => setShowNotifications(false)} style={styles.closeBtn}>
                ✕
              </button>
            </div>
          </div>
          <div style={styles.notificationsList}>
            {notifications.length === 0 ? (
              <p style={styles.noNotifications}>Aucune notification</p>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  style={{
                    ...styles.notificationItem,
                    background: notif.lue ? '#f8f9fa' : '#e3f2fd',
                    cursor: notif.lue ? 'default' : 'pointer',
                  }}
                  onClick={() => !notif.lue && handleMarkAsRead(notif.id)}
                >
                  <div style={styles.notifHeader}>
                    <strong>{getNotifIcon(notif.type)} {notif.titre}</strong>
                    {!notif.lue && <span style={styles.newBadge}>NOUVEAU</span>}
                  </div>
                  <p style={styles.notifMessage}>{notif.message}</p>
                  <p style={styles.notifTime}>{formatTime(notif.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>👋 Bienvenue {agent?.prenom}</h2>
          <div style={styles.status}>
            <span style={styles.statusDot(agent?.disponible)}></span>
            {agent?.disponible ? 'Disponible' : 'Indisponible'}
          </div>
        </div>

        {priseEnCours && (
          <div style={styles.currentPrise}>
            <h3>🔄 Prise en charge en cours</h3>
            <div style={styles.currentCard}>
              <div>
                <strong>Passager:</strong> {priseEnCours.reservations.profiles.prenom} {priseEnCours.reservations.profiles.nom}
              </div>
              <div>
                <strong>Trajet:</strong> {priseEnCours.reservations.depart_lieu} → {priseEnCours.reservations.arrivee_lieu}
              </div>
              <button 
                onClick={() => navigate(`/prise-en-charge/${priseEnCours.reservation_id}`)}
                style={styles.continueBtn}
              >
                Continuer l'assistance
              </button>
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h3>📋 Passagers PMR à assister ({reservationsPmr.length})</h3>
          
          {reservationsPmr.length === 0 ? (
            <div style={styles.empty}>
              <p>✅ Aucune assistance en attente pour le moment</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {reservationsPmr.map((reservation) => (
                <div key={reservation.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.badge}>
                      {reservation.enregistrements?.length > 0 ? '✅ Enregistré' : '⏳ Non enregistré'}
                    </span>
                    <span style={styles.priority}>
                      {isPriorityPax(reservation) ? '🔴 Prioritaire' : '🟢 Normal'}
                    </span>
                  </div>

                  <h4 style={styles.cardTitle}>
                    {reservation.profiles.prenom} {reservation.profiles.nom}
                  </h4>

                  <div style={styles.cardInfo}>
                    <div style={styles.infoRow}>
                      <strong>📍 Trajet:</strong>
                      <span>{reservation.depart_lieu} → {reservation.arrivee_lieu}</span>
                    </div>
                    
                    <div style={styles.infoRow}>
                      <strong>📅 Départ:</strong>
                      <span>{new Date(reservation.date_depart).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>

                    <div style={styles.infoRow}>
                      <strong>🎫 Réservation:</strong>
                      <span>{reservation.num_reza_mmt}</span>
                    </div>

                    <div style={styles.infoRow}>
                      <strong>🚉 Étapes:</strong>
                      <span>{reservation.etapes?.length || 0}</span>
                    </div>
                  </div>

                  {reservation.enregistrements?.length > 0 && (
                    <div style={styles.qrInfo}>
                      ✅ QR Code disponible
                    </div>
                  )}

                  <button 
                    onClick={() => handleDebutPriseEnCharge(reservation.id)}
                    style={styles.startBtn}
                    disabled={!reservation.enregistrements?.length}
                  >
                    {reservation.enregistrements?.length > 0 
                      ? '🚀 Débuter l\'assistance'
                      : '⏳ En attente d\'enregistrement'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.infoBox}>
          <h4>ℹ️ Instructions pour agents PMR</h4>
          <ul style={styles.list}>
            <li>Vérifiez l'enregistrement du passager avant de débuter</li>
            <li>Scannez le QR code pour accéder au dossier complet</li>
            <li>Accompagnez le passager à chaque étape</li>
            <li>Signalez tout problème immédiatement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const isPriorityPax = (reservation) => {
  const departDate = new Date(reservation.date_depart);
  const now = new Date();
  const diffHours = (departDate - now) / (1000 * 60 * 60);
  return diffHours < 3; // Prioritaire si départ dans moins de 3h
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  nav: {
    background: 'white',
    padding: '20px 40px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    margin: 0,
    color: '#e67e22',
  },
  userName: {
    marginRight: '20px',
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    background: 'white',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  statusDot: (disponible) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: disponible ? '#28a745' : '#dc3545',
  }),
  currentPrise: {
    background: '#fff3cd',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    borderLeft: '4px solid #ffc107',
  },
  currentCard: {
    marginTop: '15px',
  },
  continueBtn: {
    marginTop: '15px',
    padding: '12px 24px',
    background: '#e67e22',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    background: '#d4edda',
    color: '#155724',
  },
  priority: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  cardTitle: {
    margin: '10px 0',
    fontSize: '18px',
    color: '#333',
  },
  cardInfo: {
    marginTop: '15px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid #f0f0f0',
  },
  qrInfo: {
    marginTop: '15px',
    padding: '10px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  startBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '15px',
    background: '#e67e22',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    color: '#666',
  },
  infoBox: {
    background: '#e3f2fd',
    padding: '20px',
    borderRadius: '12px',
  },
  list: {
    marginTop: '10px',
    paddingLeft: '20px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  notificationBtn: {
    position: 'relative',
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  notificationBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  notificationsPanel: {
    position: 'fixed',
    top: '80px',
    right: '40px',
    width: '400px',
    maxHeight: '600px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  notificationsPanelHeader: {
    padding: '20px',
    borderBottom: '2px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8f9fa',
  },
  markAllBtn: {
    padding: '6px 12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '10px',
  },
  closeBtn: {
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  notificationsList: {
    maxHeight: '500px',
    overflowY: 'auto',
  },
  noNotifications: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#999',
  },
  notificationItem: {
    padding: '15px 20px',
    borderBottom: '1px solid #eee',
    transition: 'background 0.2s',
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  newBadge: {
    padding: '4px 8px',
    background: '#dc3545',
    color: 'white',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  notifMessage: {
    fontSize: '14px',
    color: '#555',
    margin: '5px 0',
  },
  notifTime: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px',
  },
};

export default DashboardAgent;
