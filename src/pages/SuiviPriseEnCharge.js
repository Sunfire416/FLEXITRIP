import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SuiviPriseEnCharge.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const SuiviPriseEnCharge = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [prisesEnCharge, setPrisesEnCharge] = useState([]);
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  useEffect(() => {
    fetchPrisesEnCharge();
    
    // Auto-refresh toutes les 10 secondes si activé
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchPrisesEnCharge(true); // silent refresh
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reservationId, autoRefresh]);
  
  const fetchPrisesEnCharge = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await axios.get(
        `${API_BASE_URL}/prise-en-charge/reservation/${reservationId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      if (response.data.success) {
        setPrisesEnCharge(response.data.prises_en_charge || []);
        setReservation(response.data.reservation || null);
      }
    } catch (err) {
      console.error('❌ Erreur fetch:', err);
      if (!silent) {
        setError(err.response?.data?.error || 'Erreur lors du chargement');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'validated': return '✅';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'validated': return 'Validée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'validated': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  const copyLink = (url, etape) => {
    navigator.clipboard.writeText(url);
    alert(`✅ Lien copié pour l'étape ${etape} !`);
  };

  const openChat = (etapeNumero) => {
    if (!reservationId || !etapeNumero) return;
    navigate(`/chat/reservation/${reservationId}/etape/${etapeNumero}`);
  };
  
  const validatedCount = prisesEnCharge.filter(p => p.status === 'validated').length;
  const progressPercentage = prisesEnCharge.length > 0 
    ? (validatedCount / prisesEnCharge.length) * 100 
    : 0;
  
  if (loading) {
    return (
      <div className="suivi-container">
        <div className="suivi-loading">
          <div className="spinner"></div>
          <p>⏳ Chargement du suivi...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="suivi-container">
        <div className="suivi-error">
          <div className="error-icon">❌</div>
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/user/voyages')} className="btn-back">
            Retour à mes voyages
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="suivi-container">
      <div className="suivi-header">
        <button onClick={() => navigate(-1)} className="btn-back-simple">
          ← Retour
        </button>
        <h1>📊 Suivi des Prises en Charge</h1>
        <div className="auto-refresh-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (10s)
          </label>
        </div>
      </div>
      
      {reservation && (
        <div className="reservation-info-card">
          <h3>📋 Réservation #{reservationId}</h3>
          <p><strong>Trajet :</strong> {reservation.lieu_depart} → {reservation.lieu_arrivee}</p>
          <p><strong>Date :</strong> {new Date(reservation.date_depart).toLocaleString('fr-FR')}</p>
        </div>
      )}
      
      <div className="progress-section">
        <div className="progress-header">
          <span>{validatedCount} / {prisesEnCharge.length} validées</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: progressPercentage === 100 ? '#10b981' : '#f59e0b'
            }}
          ></div>
        </div>
      </div>
      
      {prisesEnCharge.length === 0 ? (
        <div className="no-data">
          <p>Aucune prise en charge trouvée pour cette réservation.</p>
        </div>
      ) : (
        <div className="timeline">
          {prisesEnCharge.map((pec, index) => (
            <div 
              key={pec.id} 
              className={`timeline-item ${pec.status}`}
              style={{ '--status-color': getStatusColor(pec.status) }}
            >
              <div className="timeline-marker">
                <span className="etape-number">{pec.etape_numero}</span>
                <span className="status-icon">{getStatusIcon(pec.status)}</span>
              </div>
              
              <div className="timeline-content">
                <div className="timeline-header">
                  <h3>
                    {pec.segment?.mode || pec.reservation?.type_transport || 'Transport'} 
                    {pec.segment?.line && ` - Ligne ${pec.segment.line}`}
                  </h3>
                  <div className="timeline-header-actions">
                    {pec.status === 'validated' ? (
                      <button
                        type="button"
                        className="btn-chat"
                        onClick={() => openChat(pec.etape_numero)}
                      >
                        💬 Ouvrir le chat
                      </button>
                    ) : null}
                    <span className={`status-badge ${pec.status}`}>
                      {getStatusIcon(pec.status)} {getStatusLabel(pec.status)}
                    </span>
                  </div>
                </div>
                
                <div className="timeline-details">
                  <p><strong>📍 Lieu :</strong> {pec.location}</p>
                  {pec.segment?.operator && (
                    <p><strong>🏢 Opérateur :</strong> {pec.segment.operator}</p>
                  )}
                  
                  {pec.status === 'pending' && (
                    <div className="validation-link-box">
                      <label>🔗 Lien de validation :</label>
                      <div className="link-input-group">
                        <input 
                          type="text" 
                          readOnly 
                          value={pec.validation_url} 
                          className="link-input"
                          onClick={(e) => e.target.select()}
                        />
                        <button 
                          className="btn-copy"
                          onClick={() => copyLink(pec.validation_url, pec.etape_numero)}
                        >
                          📋 Copier
                        </button>
                      </div>
                      <small>Partagez ce lien au personnel du transport</small>
                    </div>
                  )}
                  
                  {pec.status === 'validated' && (
                    <div className="validated-info">
                      <p><strong>✅ Validée le :</strong> {new Date(pec.validated_at).toLocaleString('fr-FR')}</p>
                      {pec.validated_by && (
                        <p><strong>👤 Par :</strong> {pec.validated_by}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {index < prisesEnCharge.length - 1 && (
                <div className="timeline-connector"></div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="suivi-actions">
        <button onClick={() => fetchPrisesEnCharge()} className="btn-refresh">
          🔄 Actualiser
        </button>
        <button onClick={() => navigate('/user/voyages')} className="btn-voyages">
          ✈️ Mes Voyages
        </button>
      </div>
    </div>
  );
};

export default SuiviPriseEnCharge;
