import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

function MesVoyages() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmee, en_cours, terminee
  const navigate = useNavigate();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const { data } = await supabase
        .from('reservations')
        .select(`
          *,
          etapes(*),
          enregistrements(*)
        `)
        .eq('profile_id', profileData.id)
        .order('created_at', { ascending: false });

      setReservations(data || []);
    }
    
    setLoading(false);
  };

  const filteredReservations = reservations.filter(r => 
    filter === 'all' || r.statut === filter
  );

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Retour</button>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>📋 Mes voyages</h2>
          <button onClick={() => navigate('/reservation')} style={styles.newBtn}>
            ➕ Nouvelle réservation
          </button>
        </div>

        <div style={styles.filters}>
          <button 
            onClick={() => setFilter('all')}
            style={filter === 'all' ? styles.filterActive : styles.filter}
          >
            Tous ({reservations.length})
          </button>
          <button 
            onClick={() => setFilter('confirmee')}
            style={filter === 'confirmee' ? styles.filterActive : styles.filter}
          >
            Confirmés
          </button>
          <button 
            onClick={() => setFilter('en_cours')}
            style={filter === 'en_cours' ? styles.filterActive : styles.filter}
          >
            En cours
          </button>
          <button 
            onClick={() => setFilter('terminee')}
            style={filter === 'terminee' ? styles.filterActive : styles.filter}
          >
            Terminés
          </button>
        </div>

        {filteredReservations.length === 0 ? (
          <div style={styles.empty}>
            <p>🎫 Aucune réservation trouvée</p>
          </div>
        ) : (
          <div style={styles.list}>
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>
                      {reservation.depart_lieu} → {reservation.arrivee_lieu}
                    </h3>
                    <p style={styles.cardDate}>
                      📅 {new Date(reservation.date_depart).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span style={styles.badge(reservation.statut)}>
                    {reservation.statut}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.info}>
                    <strong>🎫 N° Réservation:</strong> {reservation.num_reza_mmt}
                  </div>
                  
                  <div style={styles.info}>
                    <strong>💰 Prix:</strong> {reservation.prix_total} €
                  </div>

                  <div style={styles.info}>
                    <strong>🚉 Étapes:</strong> {reservation.etapes?.length || 0}
                  </div>

                  {reservation.multimodal && (
                    <div style={styles.tag}>🔄 Voyage multimodal</div>
                  )}

                  {reservation.assistance_pmr && (
                    <div style={styles.tagPmr}>♿ Assistance PMR</div>
                  )}

                  {reservation.enregistrements?.length > 0 && (
                    <div style={styles.tagSuccess}>
                      ✅ Enregistré - Carte d'embarquement disponible
                    </div>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  <button 
                    onClick={() => navigate(`/enregistrement/${reservation.id}`)}
                    style={styles.detailBtn}
                  >
                    📄 Voir les détails
                  </button>
                  
                  {!reservation.enregistrements?.length && reservation.statut === 'confirmee' && (
                    <button 
                      onClick={() => navigate(`/enregistrement/${reservation.id}`)}
                      style={styles.enregBtn}
                    >
                      ✈️ S'enregistrer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
  backBtn: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  newBtn: {
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
  },
  filter: {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  filterActive: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee',
  },
  cardTitle: {
    margin: '0 0 10px 0',
    fontSize: '20px',
  },
  cardDate: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  badge: (statut) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    background: 
      statut === 'confirmee' ? '#d4edda' :
      statut === 'en_cours' ? '#cce5ff' :
      statut === 'terminee' ? '#d1ecf1' : '#f8d7da',
    color: 
      statut === 'confirmee' ? '#155724' :
      statut === 'en_cours' ? '#004085' :
      statut === 'terminee' ? '#0c5460' : '#721c24',
  }),
  cardBody: {
    marginBottom: '20px',
  },
  info: {
    margin: '10px 0',
    fontSize: '14px',
  },
  tag: {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '6px',
    fontSize: '13px',
    marginRight: '10px',
    marginTop: '10px',
  },
  tagPmr: {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#fff3cd',
    color: '#856404',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  tagSuccess: {
    display: 'block',
    padding: '10px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  cardFooter: {
    display: 'flex',
    gap: '10px',
  },
  detailBtn: {
    flex: 1,
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  enregBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
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
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
};

export default MesVoyages;
