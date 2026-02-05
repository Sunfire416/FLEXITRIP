import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

function CarteTaxi() {
  const { etapeId } = useParams();
  const [etape, setEtape] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState(0);
  const [positionTaxi, setPositionTaxi] = useState(null);
  const [eta, setEta] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [etapeId]);

  const loadData = async () => {
    try {
      console.log('📋 Chargement étape:', etapeId);

      // Charger l'étape
      const { data: etapeData, error: etapeError } = await supabase
        .from('etapes')
        .select(`
          *,
          reservations(*)
        `)
        .eq('id', etapeId)
        .single();

      if (etapeError) throw etapeError;

      console.log('✅ Étape chargée:', etapeData);

      // Charger la simulation
      const { data: simData, error: simError } = await supabase
        .from('simulations_taxi')
        .select('*')
        .eq('etape_id', etapeId)
        .single();

      if (simError) throw simError;

      console.log('✅ Simulation chargée:', simData);

      setEtape(etapeData);
      setSimulation(simData);
      setProgression(simData.progression_pct || 0);
      setPositionTaxi(simData.position_actuelle);
      setEta(simData.eta_minutes || 0);

      // Si simulation déjà en cours, reprendre
      if (simData.statut_course === 'en_cours') {
        setEnCours(true);
      }

    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const calculerPositionIntermediaire = (depart, arrivee, progressionPct) => {
    // Interpolation linéaire entre départ et arrivée
    const lat = depart.lat + (arrivee.lat - depart.lat) * (progressionPct / 100);
    const lng = depart.lng + (arrivee.lng - depart.lng) * (progressionPct / 100);
    return { lat, lng };
  };

  const demarrerSimulation = async () => {
    try {
      console.log('🚀 Démarrage simulation');

      // Mettre à jour le statut en BDD
      const { error: updateError } = await supabase
        .from('simulations_taxi')
        .update({
          statut_course: 'en_cours',
          heure_debut_simulation: new Date().toISOString(),
          progression_pct: 0,
        })
        .eq('id', simulation.id);

      if (updateError) throw updateError;

      setEnCours(true);
      setProgression(0);

      // Animation : 30 secondes, 100 étapes (1 étape toutes les 300ms)
      const dureeAnimation = 30000; // 30 secondes
      const nbEtapes = 100;
      const intervalMs = dureeAnimation / nbEtapes;
      const etaDureeMinutes = simulation.eta_minutes || 25;

      let step = 0;

      const intervalId = setInterval(async () => {
        step++;
        const progressionActuelle = step;

        // Calculer nouvelle position
        const nouvellePosition = calculerPositionIntermediaire(
          simulation.position_depart,
          simulation.position_arrivee,
          progressionActuelle
        );

        // Calculer ETA restant (diminue proportionnellement)
        const etaRestant = Math.round(etaDureeMinutes * (100 - progressionActuelle) / 100);

        // Mettre à jour les états
        setProgression(progressionActuelle);
        setPositionTaxi(nouvellePosition);
        setEta(etaRestant);

        // Mettre à jour en BDD toutes les 10 étapes (pour éviter trop de requêtes)
        if (progressionActuelle % 10 === 0 || progressionActuelle === 100) {
          await supabase
            .from('simulations_taxi')
            .update({
              position_actuelle: nouvellePosition,
              progression_pct: progressionActuelle,
              eta_minutes: etaRestant,
            })
            .eq('id', simulation.id);

          console.log(`📍 Progression: ${progressionActuelle}%, ETA: ${etaRestant} min`);
        }

        // Fin de la simulation
        if (progressionActuelle >= 100) {
          clearInterval(intervalId);
          
          await supabase
            .from('simulations_taxi')
            .update({
              statut_course: 'arrivee',
              progression_pct: 100,
              eta_minutes: 0,
              heure_fin_simulation: new Date().toISOString(),
            })
            .eq('id', simulation.id);

          setEnCours(false);
          alert('🎯 Arrivée à destination !');
          console.log('✅ Simulation terminée');
        }
      }, intervalMs);

    } catch (error) {
      console.error('❌ Erreur simulation:', error);
      alert('Erreur lors du démarrage');
    }
  };

  const arreterSimulation = async () => {
    try {
      await supabase
        .from('simulations_taxi')
        .update({
          statut_course: 'en_attente',
        })
        .eq('id', simulation.id);

      setEnCours(false);
      alert('⏸️ Simulation arrêtée');
    } catch (error) {
      console.error('❌ Erreur arrêt:', error);
    }
  };

  // Convertir coordonnées GPS en position % sur la carte
  const convertirGPSEnPosition = (position, bounds) => {
    if (!position || !bounds) return { x: 0, y: 0 };

    const x = ((position.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - position.lat) / (bounds.maxLat - bounds.minLat)) * 100;

    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const calculerBounds = () => {
    if (!simulation) return null;

    const positions = [
      simulation.position_depart,
      simulation.position_arrivee,
    ];

    const lats = positions.map(p => p.lat);
    const lngs = positions.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Ajouter une marge de 10%
    const marginLat = (maxLat - minLat) * 0.1;
    const marginLng = (maxLng - minLng) * 0.1;

    return {
      minLat: minLat - marginLat,
      maxLat: maxLat + marginLat,
      minLng: minLng - marginLng,
      maxLng: maxLng + marginLng,
    };
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  if (!etape || !simulation) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Données non trouvées</div>
      </div>
    );
  }

  const bounds = calculerBounds();
  const posDepart = convertirGPSEnPosition(simulation.position_depart, bounds);
  const posArrivee = convertirGPSEnPosition(simulation.position_arrivee, bounds);
  const posTaxi = positionTaxi ? convertirGPSEnPosition(positionTaxi, bounds) : posDepart;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button 
          onClick={() => navigate(`/prise-en-charge-taxi/${etape.reservations.id}`)} 
          style={styles.backBtn}
        >
          ← Retour
        </button>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>🚕 Suivi GPS en temps réel</h2>
          <p style={styles.subtitle}>
            {etape.depart_lieu} → {etape.arrivee_lieu}
          </p>
        </div>

        {/* Infos véhicule et chauffeur */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <div style={styles.infoSection}>
              <h3>🚗 Véhicule</h3>
              <p><strong>{simulation.vehicule_info.modele}</strong></p>
              <p>Couleur : {simulation.vehicule_info.couleur}</p>
              <p>Plaque : <strong>{simulation.vehicule_info.plaque}</strong></p>
            </div>

            <div style={styles.infoSection}>
              <h3>👤 Chauffeur</h3>
              <p><strong>{simulation.chauffeur_info.prenom} {simulation.chauffeur_info.nom}</strong></p>
              <p>⭐ Note : {simulation.chauffeur_info.note}/5</p>
              <p>📞 {simulation.chauffeur_info.telephone}</p>
            </div>

            <div style={styles.infoSection}>
              <h3>⏱️ Estimation</h3>
              <p><strong>ETA : {eta} min</strong></p>
              <p>Distance : {etape.distance_km} km</p>
              <p>Progression : {Math.round(progression)}%</p>
            </div>
          </div>
        </div>

        {/* CARTE GPS */}
        <div style={styles.mapContainer}>
          <div style={styles.map}>
            {/* Grille de fond */}
            <svg style={styles.mapSvg}>
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Ligne de trajet */}
              <line
                x1={`${posDepart.x}%`}
                y1={`${posDepart.y}%`}
                x2={`${posArrivee.x}%`}
                y2={`${posArrivee.y}%`}
                stroke="#667eea"
                strokeWidth="3"
                strokeDasharray="10,5"
                opacity="0.6"
              />
            </svg>

            {/* Marqueur DÉPART */}
            <div 
              style={{
                ...styles.marqueur,
                left: `${posDepart.x}%`,
                top: `${posDepart.y}%`,
              }}
            >
              <div style={styles.marqueurIconDepart}>📍</div>
              <div style={styles.marqueurLabel}>Départ</div>
            </div>

            {/* Marqueur ARRIVÉE */}
            <div 
              style={{
                ...styles.marqueur,
                left: `${posArrivee.x}%`,
                top: `${posArrivee.y}%`,
              }}
            >
              <div style={styles.marqueurIconArrivee}>🎯</div>
              <div style={styles.marqueurLabel}>Arrivée</div>
            </div>

            {/* Marqueur TAXI (animé) */}
            <div 
              style={{
                ...styles.marqueur,
                left: `${posTaxi.x}%`,
                top: `${posTaxi.y}%`,
                transition: 'all 0.3s ease-out',
              }}
            >
              <div style={styles.marqueurIconTaxi}>🚗</div>
              <div style={styles.marqueurLabelTaxi}>
                Taxi - {Math.round(progression)}%
              </div>
            </div>
          </div>

          {/* Légende */}
          <div style={styles.legende}>
            <div style={styles.legendeItem}>
              <span style={styles.legendeIcon}>📍</span>
              <span>Point de départ</span>
            </div>
            <div style={styles.legendeItem}>
              <span style={styles.legendeIcon}>🚗</span>
              <span>Taxi en cours</span>
            </div>
            <div style={styles.legendeItem}>
              <span style={styles.legendeIcon}>🎯</span>
              <span>Destination</span>
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>
            <span>Progression du trajet</span>
            <span><strong>{Math.round(progression)}%</strong></span>
          </div>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progression}%`}}>
              {progression > 10 && <span style={styles.progressText}>{Math.round(progression)}%</span>}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div style={styles.controls}>
          {!enCours ? (
            <button onClick={demarrerSimulation} style={styles.startBtn}>
              🚀 Démarrer la simulation (30s)
            </button>
          ) : (
            <div style={styles.enCoursInfo}>
              <div style={styles.spinner}></div>
              <span>Simulation en cours... {Math.round(progression)}%</span>
              <button onClick={arreterSimulation} style={styles.stopBtn}>
                ⏸️ Arrêter
              </button>
            </div>
          )}
        </div>

        {/* Coordonnées GPS (debug) */}
        <div style={styles.debugInfo}>
          <details>
            <summary style={styles.debugSummary}>📊 Infos techniques</summary>
            <div style={styles.debugContent}>
              <p><strong>Position actuelle taxi :</strong></p>
              <p>Lat: {positionTaxi?.lat.toFixed(6)}, Lng: {positionTaxi?.lng.toFixed(6)}</p>
              <p><strong>Départ :</strong> Lat: {simulation.position_depart.lat}, Lng: {simulation.position_depart.lng}</p>
              <p><strong>Arrivée :</strong> Lat: {simulation.position_arrivee.lat}, Lng: {simulation.position_arrivee.lng}</p>
              <p><strong>Statut :</strong> {simulation.statut_course}</p>
            </div>
          </details>
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
  backBtn: {
    padding: '8px 16px',
    background: '#667eea',
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
    marginBottom: '30px',
  },
  subtitle: {
    color: '#666',
    marginTop: '10px',
  },
  infoCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '25px',
  },
  infoSection: {
    borderLeft: '3px solid #667eea',
    paddingLeft: '15px',
  },
  mapContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  map: {
    position: 'relative',
    width: '100%',
    height: '500px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid #ddd',
  },
  mapSvg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  marqueur: {
    position: 'absolute',
    transform: 'translate(-50%, -100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
  },
  marqueurIconDepart: {
    fontSize: '40px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  marqueurIconArrivee: {
    fontSize: '40px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  marqueurIconTaxi: {
    fontSize: '45px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
  },
  marqueurLabel: {
    background: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
  },
  marqueurLabelTaxi: {
    background: '#667eea',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '5px',
    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.4)',
    whiteSpace: 'nowrap',
  },
  legende: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginTop: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  legendeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  legendeIcon: {
    fontSize: '24px',
  },
  progressSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px',
  },
  progressBar: {
    width: '100%',
    height: '30px',
    background: '#e9ecef',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  startBtn: {
    padding: '15px 40px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
  },
  enCoursInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px 30px',
    background: '#fff3cd',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  stopBtn: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  debugInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
  },
  debugSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  debugContent: {
    marginTop: '10px',
    fontSize: '13px',
    fontFamily: 'monospace',
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

export default CarteTaxi;
