import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function CarteSuivi({ agent, reservation }) {
  const [agentPosition, setAgentPosition] = useState(null);
  const [passagerPosition, setPassagerPosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveProgress, setMoveProgress] = useState(0);

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 3000); // Refresh toutes les 3s
    return () => clearInterval(interval);
  }, [agent, reservation]);

  useEffect(() => {
    if (agentPosition && passagerPosition) {
      const dist = calculateDistance(agentPosition, passagerPosition);
      setDistance(dist);
      
      // Alerte si proche
      if (dist < 0.1 && dist > 0) { // < 100m
        alert(`🎯 Vous êtes arrivé près du passager ! (${Math.round(dist * 1000)}m)`);
      }
    }
  }, [agentPosition, passagerPosition]);

  const loadPositions = async () => {
    if (!agent || !reservation) return;

    // Charger position agent
    const { data: agentData } = await supabase
      .from('agents_pmr')
      .select('localisation_gps')
      .eq('id', agent.id)
      .single();

    if (agentData?.localisation_gps) {
      // Format POINT est "POINT(lng lat)" donc on parse
      const coords = parsePointToLatLng(agentData.localisation_gps);
      setAgentPosition(coords);
    } else {
      // Position par défaut si pas de GPS (Paris centre)
      setAgentPosition({ lat: 48.8566, lng: 2.3522 });
    }

    // Position passager (point de RDV)
    if (reservation.gps_point_rdv && Object.keys(reservation.gps_point_rdv).length > 0) {
      setPassagerPosition(reservation.gps_point_rdv);
    } else if (reservation.gps_depart && Object.keys(reservation.gps_depart).length > 0) {
      setPassagerPosition(reservation.gps_depart);
    } else {
      // Position par défaut (Paris Gare de Lyon)
      setPassagerPosition({ lat: 48.8447, lng: 2.3736 });
    }
  };

  const parsePointToLatLng = (pointString) => {
    // Format PostgreSQL POINT: "POINT(lng lat)" ou "(lng,lat)"
    if (!pointString) return null;
    
    const match = pointString.match(/\(([^,]+),([^)]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
    }
    return null;
  };

  const calculateDistance = (pos1, pos2) => {
    // Formule de Haversine pour calculer distance en km
    const R = 6371; // Rayon de la Terre en km
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // en km
  };

  const handleSimulerDeplacement = async () => {
    if (!agentPosition || !passagerPosition) {
      alert('Positions GPS non disponibles');
      return;
    }

    setIsMoving(true);
    setMoveProgress(0);

    // Simuler le déplacement en 10 étapes
    const steps = 10;
    let currentStep = 0;

    const moveInterval = setInterval(async () => {
      currentStep++;
      const progress = currentStep / steps;
      setMoveProgress(progress * 100);

      // Interpolation linéaire entre position actuelle et destination
      const newLat = agentPosition.lat + (passagerPosition.lat - agentPosition.lat) * progress;
      const newLng = agentPosition.lng + (passagerPosition.lng - agentPosition.lng) * progress;

      const newPosition = { lat: newLat, lng: newLng };
      setAgentPosition(newPosition);

      // Mettre à jour en BDD (format POINT PostgreSQL)
      await supabase
        .from('agents_pmr')
        .update({ 
          localisation_gps: `POINT(${newLng} ${newLat})`
        })
        .eq('id', agent.id);

      if (currentStep >= steps) {
        clearInterval(moveInterval);
        setIsMoving(false);
        setMoveProgress(0);
        alert('🎯 Arrivée au point de rendez-vous !');
      }
    }, 1000); // 1 seconde par étape = 10 secondes total
  };

  const getMapPosition = (pos) => {
    if (!pos || !agentPosition || !passagerPosition) return { x: 50, y: 50 };

    // Calculer les bounds de la carte
    const minLat = Math.min(agentPosition.lat, passagerPosition.lat) - 0.01;
    const maxLat = Math.max(agentPosition.lat, passagerPosition.lat) + 0.01;
    const minLng = Math.min(agentPosition.lng, passagerPosition.lng) - 0.01;
    const maxLng = Math.max(agentPosition.lng, passagerPosition.lng) + 0.01;

    // Convertir lat/lng en position % sur la carte
    const x = ((pos.lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - pos.lat) / (maxLat - minLat)) * 100; // Inverser Y car carte

    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  if (!agentPosition || !passagerPosition) {
    return <div style={styles.loading}>Chargement des positions GPS...</div>;
  }

  const agentMapPos = getMapPosition(agentPosition);
  const passagerMapPos = getMapPosition(passagerPosition);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>🗺️ Suivi GPS temps réel</h3>
        <div style={styles.distanceInfo}>
          <strong>Distance:</strong> {distance ? `${(distance * 1000).toFixed(0)}m` : '---'}
        </div>
      </div>

      <div style={styles.infoRow}>
        <div style={styles.infoBox}>
          <strong>🚗 Agent ({agent.prenom})</strong>
          <p>Lat: {agentPosition.lat.toFixed(4)}</p>
          <p>Lng: {agentPosition.lng.toFixed(4)}</p>
        </div>
        <div style={styles.infoBox}>
          <strong>📍 Passager ({reservation.profiles.prenom})</strong>
          <p>Lat: {passagerPosition.lat.toFixed(4)}</p>
          <p>Lng: {passagerPosition.lng.toFixed(4)}</p>
        </div>
      </div>

      <div style={styles.mapContainer}>
        {/* Carte simulée */}
        <div style={styles.map}>
          {/* Ligne de trajet */}
          <svg style={styles.svg}>
            <line
              x1={`${agentMapPos.x}%`}
              y1={`${agentMapPos.y}%`}
              x2={`${passagerMapPos.x}%`}
              y2={`${passagerMapPos.y}%`}
              stroke="#667eea"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>

          {/* Marqueur Agent */}
          <div
            style={{
              ...styles.marker,
              ...styles.markerAgent,
              left: `${agentMapPos.x}%`,
              top: `${agentMapPos.y}%`,
            }}
          >
            🚗
          </div>

          {/* Marqueur Passager */}
          <div
            style={{
              ...styles.marker,
              ...styles.markerPassager,
              left: `${passagerMapPos.x}%`,
              top: `${passagerMapPos.y}%`,
            }}
          >
            📍
          </div>

          {/* Grille de fond */}
          <div style={styles.grid}></div>
        </div>
      </div>

      <div style={styles.controls}>
        <button
          onClick={handleSimulerDeplacement}
          disabled={isMoving}
          style={styles.simulateBtn}
        >
          {isMoving ? `🔄 Déplacement en cours (${Math.round(moveProgress)}%)` : '🚗 Simuler déplacement vers passager'}
        </button>
        
        {isMoving && (
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${moveProgress}%`}}></div>
          </div>
        )}
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span>🚗</span> Agent PMR
        </div>
        <div style={styles.legendItem}>
          <span>📍</span> Point de rendez-vous
        </div>
        <div style={styles.legendItem}>
          <span style={{...styles.line, background: '#667eea'}}></span> Trajet
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginTop: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  distanceInfo: {
    padding: '10px 20px',
    background: '#e3f2fd',
    borderRadius: '20px',
    fontSize: '16px',
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px',
  },
  infoBox: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  mapContainer: {
    marginBottom: '20px',
  },
  map: {
    position: 'relative',
    width: '100%',
    height: '400px',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid #ddd',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)',
    backgroundSize: '50px 50px',
    opacity: 0.3,
  },
  marker: {
    position: 'absolute',
    fontSize: '30px',
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.5s ease',
    cursor: 'pointer',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  markerAgent: {
    zIndex: 10,
  },
  markerPassager: {
    zIndex: 5,
  },
  controls: {
    marginBottom: '20px',
  },
  simulateBtn: {
    width: '100%',
    padding: '15px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  progressBar: {
    marginTop: '15px',
    height: '30px',
    background: '#e9ecef',
    borderRadius: '15px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    transition: 'width 0.5s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  line: {
    display: 'inline-block',
    width: '30px',
    height: '3px',
    borderRadius: '2px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
};

export default CarteSuivi;
