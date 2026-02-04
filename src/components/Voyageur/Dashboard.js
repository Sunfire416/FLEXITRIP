import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

function DashboardVoyageur() {
  const [profile, setProfile] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadReservations();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setProfile(data);
  };

  const loadReservations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select(`
          *,
          etapes(*),
          factures(*)
        `)
        .eq('profile_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setReservations(reservationsData || []);
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <div>
          <button onClick={() => navigate('/profil')} style={styles.navBtn}>
            👤 Mon profil
          </button>
          <button onClick={() => navigate('/voyageurs')} style={styles.navBtn}>
            👥 Mes voyageurs
          </button>
          <button onClick={() => navigate('/factures')} style={styles.navBtn}>
            💰 Mes factures
          </button>
          <span style={styles.userName}>{profile?.prenom} {profile?.nom}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>Bienvenue {profile?.prenom} 👋</h2>
          <p style={styles.subtitle}>Gérez vos voyages multimodaux en toute simplicité</p>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={() => navigate('/reservation')} 
            style={styles.primaryBtn}
          >
            ➕ Nouvelle réservation
          </button>
          <button 
            onClick={() => navigate('/mes-voyages')} 
            style={styles.secondaryBtn}
          >
            📋 Tous mes voyages
          </button>
        </div>

        <div style={styles.section}>
          <h3>Mes derniers voyages</h3>
          
          {reservations.length === 0 ? (
            <div style={styles.emptyState}>
              <p>🎫 Aucune réservation pour le moment</p>
              <p style={styles.hint}>Créez votre première réservation multimodale !</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {reservations.map((reservation) => (
                <div key={reservation.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.badge(reservation.statut)}>
                      {reservation.statut}
                    </span>
                    <span style={styles.multimodal}>
                      {reservation.multimodal ? '🔄 Multimodal' : '🚄 Simple'}
                    </span>
                  </div>
                  
                  <h4 style={styles.cardTitle}>
                    {reservation.depart_lieu} → {reservation.arrivee_lieu}
                  </h4>
                  
                  <p style={styles.cardDate}>
                    📅 {new Date(reservation.date_depart).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  
                  <p style={styles.cardInfo}>
                    🎫 Réservation: <strong>{reservation.num_reza_mmt}</strong>
                  </p>
                  
                  {reservation.etapes && (
                    <p style={styles.cardInfo}>
                      🚉 {reservation.etapes.length} étape(s)
                    </p>
                  )}
                  
                  {reservation.assistance_pmr && (
                    <p style={styles.assistanceTag}>♿ Assistance PMR activée</p>
                  )}

                  {/* ÉTAPE 9 : Affichage info facture */}
                  {reservation.factures && reservation.factures.length > 0 && (
                    <div style={styles.factureInfo}>
                      <strong>Facture :</strong> {reservation.factures[0].num_facture}
                      <br />
                      <strong>Montant :</strong> {reservation.factures[0].montant_ttc?.toFixed(2)} €
                      <br />
                      <span style={styles.factureStatut(reservation.factures[0].statut)}>
                        {reservation.factures[0].statut === 'payee' ? '✅ Payée' : '⏳ En attente'}
                      </span>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => navigate(`/enregistrement/${reservation.id}`)}
                    style={styles.cardBtn}
                  >
                    Voir les détails
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.infoBox}>
          <h4>ℹ️ Besoin d'aide ?</h4>
          <p>Notre service client est disponible 24/7 pour vous accompagner</p>
          <p>📞 <strong>01 23 45 67 89</strong></p>
        </div>
      </div>
    </div>
  );
}

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
    color: '#667eea',
  },
  navBtn: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '10px',
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
    marginBottom: '40px',
  },
  subtitle: {
    color: '#666',
    fontSize: '16px',
  },
  actions: {
    display: 'flex',
    gap: '15px',
    marginBottom: '40px',
  },
  primaryBtn: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '12px 24px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    color: '#666',
  },
  hint: {
    fontSize: '14px',
    marginTop: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
  badge: (statut) => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    background: statut === 'confirmee' ? '#d4edda' : '#fff3cd',
    color: statut === 'confirmee' ? '#155724' : '#856404',
  }),
  multimodal: {
    fontSize: '12px',
    color: '#666',
  },
  cardTitle: {
    margin: '10px 0',
    fontSize: '18px',
  },
  cardDate: {
    color: '#666',
    fontSize: '14px',
    margin: '8px 0',
  },
  cardInfo: {
    fontSize: '14px',
    margin: '6px 0',
  },
  assistanceTag: {
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '10px',
    display: 'inline-block',
  },
  factureInfo: {
    marginTop: '15px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '14px',
  },
  factureStatut: (statut) => ({
    display: 'inline-block',
    marginTop: '5px',
    padding: '4px 10px',
    background: statut === 'payee' ? '#d4edda' : '#fff3cd',
    color: statut === 'payee' ? '#155724' : '#856404',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  }),
  cardBtn: {
    width: '100%',
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '15px',
    fontWeight: 'bold',
  },
  infoBox: {
    background: '#fff3cd',
    padding: '20px',
    borderRadius: '12px',
    borderLeft: '4px solid #ffc107',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
};

export default DashboardVoyageur;
