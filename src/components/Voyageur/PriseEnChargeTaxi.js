import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

function PriseEnChargeTaxi() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState(null);
  const [etapesTaxi, setEtapesTaxi] = useState([]);
  const [simulations, setSimulations] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [reservationId]);

  const loadData = async () => {
    try {
      console.log('📋 Chargement réservation:', reservationId);

      // Charger la réservation avec ses étapes
      const { data: resaData, error: resaError } = await supabase
        .from('reservations')
        .select(`
          *,
          profiles(*),
          etapes(*)
        `)
        .eq('id', reservationId)
        .single();

      if (resaError) throw resaError;

      console.log('✅ Réservation chargée:', resaData);

      // Filtrer uniquement les étapes taxi
      const taxis = resaData.etapes
        .filter(etape => etape.type_transport === 'taxi')
        .sort((a, b) => a.ordre - b.ordre);

      console.log('🚕 Taxis trouvés:', taxis.length);

      setReservation(resaData);
      setEtapesTaxi(taxis);

      // Charger les simulations existantes
      if (taxis.length > 0) {
        const etapeIds = taxis.map(t => t.id);
        const { data: simsData } = await supabase
          .from('simulations_taxi')
          .select('*')
          .in('etape_id', etapeIds);

        if (simsData) {
          const simsMap = {};
          simsData.forEach(sim => {
            simsMap[sim.etape_id] = sim;
          });
          setSimulations(simsMap);
        }
      }

    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const genererDonneesFictives = () => {
    // Générer plaque aléatoire (format français)
    const lettres1 = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const chiffres = Math.floor(100 + Math.random() * 900);
    const lettres2 = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + 
                     String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const plaque = `${lettres1}-${chiffres}-${lettres2}`;

    // Modèles de voiture
    const modeles = [
      'Peugeot e-208',
      'Renault Zoé',
      'Tesla Model 3',
      'Mercedes Classe E',
      'BMW Série 5',
      'Audi A4',
      'Volkswagen ID.4',
      'Toyota Prius'
    ];

    const couleurs = ['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge', 'Argenté'];

    // Prénoms et noms
    const prenoms = ['Jean', 'Pierre', 'Michel', 'Philippe', 'Marie', 'Sophie', 'Laurent', 'François', 'Nicolas', 'Thomas'];
    const noms = ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Leroy', 'Moreau', 'Simon'];

    const note = (4 + Math.random()).toFixed(1); // Entre 4.0 et 5.0
    const nb_courses = Math.floor(500 + Math.random() * 3000);

    return {
      vehicule: {
        plaque: plaque,
        modele: modeles[Math.floor(Math.random() * modeles.length)],
        couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
        type: 'berline'
      },
      chauffeur: {
        nom: noms[Math.floor(Math.random() * noms.length)],
        prenom: prenoms[Math.floor(Math.random() * prenoms.length)],
        note: parseFloat(note),
        nb_courses: nb_courses,
        telephone: `06 ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`
      }
    };
  };

  const genererPositionsGPS = (etape) => {
    // Positions basées sur les lieux (simulées)
    const positions = {
      'Paris, Champs-Élysées': { lat: 48.8698, lng: 2.3078 },
      'Paris Gare de Lyon': { lat: 48.8447, lng: 2.3736 },
      'Marseille Saint-Charles': { lat: 43.3028, lng: 5.3806 },
      'Marseille, Stade Vélodrome': { lat: 43.2699, lng: 5.3958 },
    };

    // Trouver les positions ou utiliser des valeurs par défaut
    const depart = positions[etape.depart_lieu] || { lat: 48.8566, lng: 2.3522 };
    const arrivee = positions[etape.arrivee_lieu] || { lat: 48.8747, lng: 2.3464 };

    return { depart, arrivee };
  };

  const handlePrendreEnCharge = async (etape) => {
    try {
      console.log('🚀 Prise en charge taxi:', etape);

      // Générer données fictives
      const donnees = genererDonneesFictives();
      const positions = genererPositionsGPS(etape);

      console.log('🎲 Données générées:', donnees);
      console.log('📍 Positions GPS:', positions);

      // Vérifier si une simulation existe déjà
      const { data: simExistante } = await supabase
        .from('simulations_taxi')
        .select('*')
        .eq('etape_id', etape.id)
        .single();

      let simulationId;

      if (simExistante) {
        // Mettre à jour la simulation existante
        const { data: simUpdated, error: updateError } = await supabase
          .from('simulations_taxi')
          .update({
            active: true,
            vehicule_info: donnees.vehicule,
            chauffeur_info: donnees.chauffeur,
            position_depart: positions.depart,
            position_arrivee: positions.arrivee,
            position_actuelle: positions.depart,
            progression_pct: 0,
            eta_minutes: etape.duree_minutes || 25,
            distance_restante_km: etape.distance_km || 7.5,
            statut_course: 'en_attente',
            heure_debut_simulation: null,
            heure_fin_simulation: null,
          })
          .eq('id', simExistante.id)
          .select()
          .single();

        if (updateError) throw updateError;
        simulationId = simUpdated.id;
        console.log('✅ Simulation mise à jour:', simulationId);

      } else {
        // Créer une nouvelle simulation
        const { data: simCreated, error: createError } = await supabase
          .from('simulations_taxi')
          .insert({
            etape_id: etape.id,
            reservation_id: reservationId,
            active: true,
            vehicule_info: donnees.vehicule,
            chauffeur_info: donnees.chauffeur,
            position_depart: positions.depart,
            position_arrivee: positions.arrivee,
            position_actuelle: positions.depart,
            progression_pct: 0,
            eta_minutes: etape.duree_minutes || 25,
            distance_restante_km: etape.distance_km || 7.5,
            statut_course: 'en_attente',
          })
          .select()
          .single();

        if (createError) throw createError;
        simulationId = simCreated.id;
        console.log('✅ Simulation créée:', simulationId);
      }

      // Rediriger vers la carte GPS
      navigate(`/carte-taxi/${etape.id}`);

    } catch (error) {
      console.error('❌ Erreur prise en charge:', error);
      alert('Erreur lors de la prise en charge: ' + error.message);
    }
  };

  const formatDuree = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${heures}h${mins.toString().padStart(2, '0')}` : `${heures}h`;
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  if (!reservation) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Réservation non trouvée</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button onClick={() => navigate(`/enregistrement/${reservationId}`)} style={styles.backBtn}>
          ← Retour
        </button>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>🚕 Gestion des taxis</h2>
          <p style={styles.subtitle}>
            Réservation : {reservation.num_reza_mmt}
          </p>
        </div>

        <div style={styles.infoCard}>
          <h3>📍 Trajet</h3>
          <div style={styles.trajet}>
            {reservation.depart_lieu} → {reservation.arrivee_lieu}
          </div>
          <div style={styles.trajetInfo}>
            <span>📅 {new Date(reservation.date_depart).toLocaleDateString('fr-FR')}</span>
            <span>⏰ {new Date(reservation.date_depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {etapesTaxi.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Aucun taxi dans cette réservation</p>
          </div>
        ) : (
          <div style={styles.taxisList}>
            {etapesTaxi.map((taxi, index) => {
              const simulation = simulations[taxi.id];

              return (
                <div key={taxi.id} style={styles.taxiCard}>
                  <div style={styles.taxiHeader}>
                    <h3 style={styles.taxiTitle}>
                      🚕 Taxi {index + 1} - {taxi.operateur}
                    </h3>
                    {simulation && simulation.statut_course !== 'en_attente' && (
                      <span style={styles.statutBadge(simulation.statut_course)}>
                        {simulation.statut_course}
                      </span>
                    )}
                  </div>

                  <div style={styles.taxiBody}>
                    <div style={styles.trajetSection}>
                      <div style={styles.pointTrajet}>
                        <span style={styles.pointIcon}>🔵</span>
                        <div>
                          <strong>Départ</strong>
                          <p style={styles.lieu}>{taxi.depart_lieu}</p>
                          {taxi.depart_heure && (
                            <p style={styles.heure}>
                              {new Date(taxi.depart_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={styles.ligneTrait}></div>

                      <div style={styles.pointTrajet}>
                        <span style={styles.pointIcon}>🔴</span>
                        <div>
                          <strong>Arrivée</strong>
                          <p style={styles.lieu}>{taxi.arrivee_lieu}</p>
                          {taxi.arrivee_heure_prevue && (
                            <p style={styles.heure}>
                              {new Date(taxi.arrivee_heure_prevue).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.detailsSection}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>⏱️</span>
                        <div>
                          <strong>Durée estimée</strong>
                          <p>{formatDuree(taxi.duree_minutes)}</p>
                        </div>
                      </div>

                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>📏</span>
                        <div>
                          <strong>Distance</strong>
                          <p>{taxi.distance_km ? `${taxi.distance_km} km` : 'N/A'}</p>
                        </div>
                      </div>

                      <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>💰</span>
                        <div>
                          <strong>Prix estimé</strong>
                          <p>{taxi.prix_segment ? `${taxi.prix_segment.toFixed(2)} €` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {simulation && (
                      <div style={styles.simulationInfo}>
                        <strong>ℹ️ Informations véhicule :</strong>
                        <p>🚗 {simulation.vehicule_info.modele} {simulation.vehicule_info.couleur}</p>
                        <p>🔢 Plaque : {simulation.vehicule_info.plaque}</p>
                        <p>👤 Chauffeur : {simulation.chauffeur_info.prenom} {simulation.chauffeur_info.nom}</p>
                        <p>⭐ Note : {simulation.chauffeur_info.note}/5 ({simulation.chauffeur_info.nb_courses} courses)</p>
                      </div>
                    )}
                  </div>

                  <div style={styles.taxiActions}>
                    <button
                      onClick={() => handlePrendreEnCharge(taxi)}
                      style={styles.prendreEnChargeBtn}
                    >
                      {simulation ? '🔄 Reprendre' : '🚀 Prendre en charge'}
                    </button>
                  </div>
                </div>
              );
            })}
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
    marginBottom: '30px',
  },
  subtitle: {
    color: '#666',
    marginTop: '10px',
  },
  infoCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  trajet: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginTop: '10px',
  },
  trajetInfo: {
    display: 'flex',
    gap: '20px',
    marginTop: '10px',
    color: '#666',
    fontSize: '14px',
  },
  emptyState: {
    background: 'white',
    padding: '60px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#999',
  },
  taxisList: {
    display: 'grid',
    gap: '20px',
  },
  taxiCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  taxiHeader: {
    background: '#f8f9fa',
    padding: '20px',
    borderBottom: '2px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxiTitle: {
    margin: 0,
    color: '#333',
    fontSize: '18px',
  },
  statutBadge: (statut) => ({
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    background: statut === 'en_cours' ? '#fff3cd' : 
                statut === 'arrivee' ? '#d4edda' : 
                statut === 'termine' ? '#cfe2ff' : '#f8d7da',
    color: statut === 'en_cours' ? '#856404' : 
           statut === 'arrivee' ? '#155724' : 
           statut === 'termine' ? '#004085' : '#721c24',
  }),
  taxiBody: {
    padding: '20px',
  },
  trajetSection: {
    marginBottom: '25px',
  },
  pointTrajet: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  pointIcon: {
    fontSize: '24px',
  },
  lieu: {
    margin: '5px 0',
    color: '#333',
    fontSize: '15px',
  },
  heure: {
    margin: '3px 0',
    color: '#999',
    fontSize: '13px',
  },
  ligneTrait: {
    width: '2px',
    height: '30px',
    background: '#ddd',
    marginLeft: '12px',
    marginBottom: '10px',
  },
  detailsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: '24px',
  },
  simulationInfo: {
    padding: '15px',
    background: '#e3f2fd',
    borderRadius: '8px',
    fontSize: '14px',
  },
  taxiActions: {
    padding: '20px',
    background: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
  },
  prendreEnChargeBtn: {
    width: '100%',
    padding: '15px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  error: {
    maxWidth: '600px',
    margin: '100px auto',
    padding: '40px',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '12px',
    textAlign: 'center',
  },
};

export default PriseEnChargeTaxi;
