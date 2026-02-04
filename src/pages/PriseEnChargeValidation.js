import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PriseEnChargeValidation.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const PriseEnChargeValidation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [priseEnCharge, setPriseEnCharge] = useState(null);
  const [error, setError] = useState(null);
  const [agentQrPublicId, setAgentQrPublicId] = useState('');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  
  useEffect(() => {
    fetchPriseEnCharge();
  }, [token]);
  
  const fetchPriseEnCharge = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/prise-en-charge/${token}`);
      
      if (response.data.success) {
        setPriseEnCharge(response.data.prise_en_charge);
        
        // Si déjà validée, afficher le statut
        if (response.data.prise_en_charge.status === 'validated') {
          setValidated(true);
        }
      }
    } catch (err) {
      console.error('❌ Erreur fetch:', err);
      setError(err.response?.data?.error || 'Prise en charge introuvable');
    } finally {
      setLoading(false);
    }
  };
  
  const handleValidate = async (e) => {
    e.preventDefault();
    
    if (!agentQrPublicId.trim()) {
      alert('Veuillez saisir le QR Code de l\'agent');
      return;
    }
    
    try {
      setValidating(true);
      const response = await axios.post(
        `${API_BASE_URL}/prise-en-charge/${token}/validate`,
        { agent_qr_public_id: agentQrPublicId.trim() }
      );
      
      if (response.data.success) {
        setValidated(true);
        alert('✅ Prise en charge validée avec succès !');
        await fetchPriseEnCharge(); // Refresh pour afficher les nouvelles données
      }
    } catch (err) {
      console.error('❌ Erreur validation:', err);
      const errorMsg = err.response?.data?.error || 'Erreur lors de la validation';
      alert(`❌ ${errorMsg}`);
    } finally {
      setValidating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="pec-container">
        <div className="pec-loading">
          <div className="spinner"></div>
          <p>⏳ Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="pec-container">
        <div className="pec-error-card">
          <div className="pec-error-icon">❌</div>
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="pec-btn-home">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }
  
  if (!priseEnCharge) {
    return (
      <div className="pec-container">
        <div className="pec-error-card">
          <p>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pec-container">
      <div className="pec-card">
        <div className="pec-header">
          <h1>📋 Prise en Charge PMR</h1>
          {priseEnCharge.status === 'validated' && (
            <div className="pec-badge validated">✅ Validée</div>
          )}
          {priseEnCharge.status === 'pending' && (
            <div className="pec-badge pending">⏳ En attente</div>
          )}
          {priseEnCharge.status === 'cancelled' && (
            <div className="pec-badge cancelled">❌ Annulée</div>
          )}
        </div>
        
        <div className="pec-section">
          <h3>👤 Informations Passager</h3>
          <div className="pec-info-grid">
            <div className="pec-row">
              <span className="label">Nom :</span>
              <strong>{priseEnCharge.user.surname} {priseEnCharge.user.name}</strong>
            </div>
            <div className="pec-row">
              <span className="label">Téléphone :</span>
              <strong>{priseEnCharge.user.phone || 'Non renseigné'}</strong>
            </div>
            {priseEnCharge.user.type_handicap && (
              <div className="pec-row">
                <span className="label">Type handicap :</span>
                <strong>{priseEnCharge.user.type_handicap}</strong>
              </div>
            )}
          </div>
        </div>
        
        <div className="pec-section">
          <h3>🎫 Informations Réservation</h3>
          <div className="pec-info-grid">
            <div className="pec-row">
              <span className="label">Numéro :</span>
              <strong>{priseEnCharge.reservation.num_reza}</strong>
            </div>
            <div className="pec-row">
              <span className="label">Transport :</span>
              <strong>{priseEnCharge.segment?.mode || priseEnCharge.reservation.type_transport}</strong>
            </div>
            {priseEnCharge.segment?.line && (
              <div className="pec-row">
                <span className="label">Ligne :</span>
                <strong>{priseEnCharge.segment.line}</strong>
              </div>
            )}
            {priseEnCharge.segment?.operator && (
              <div className="pec-row">
                <span className="label">Opérateur :</span>
                <strong>{priseEnCharge.segment.operator}</strong>
              </div>
            )}
            <div className="pec-row">
              <span className="label">Étape :</span>
              <strong>#{priseEnCharge.etape_numero}</strong>
            </div>
            {priseEnCharge.reservation.assistance_PMR && (
              <div className="pec-row">
                <span className="label">Assistance PMR :</span>
                <strong>{priseEnCharge.reservation.assistance_PMR}</strong>
              </div>
            )}
          </div>
        </div>
        
        <div className="pec-section">
          <h3>📍 Trajet</h3>
          <div className="pec-info-grid">
            <div className="pec-row">
              <span className="label">Départ :</span>
              <strong>{priseEnCharge.voyage?.depart || priseEnCharge.reservation.lieu_depart}</strong>
            </div>
            <div className="pec-row">
              <span className="label">Arrivée :</span>
              <strong>{priseEnCharge.voyage?.arrivee || priseEnCharge.reservation.lieu_arrivee}</strong>
            </div>
            <div className="pec-row">
              <span className="label">Lieu prise en charge :</span>
              <strong>{priseEnCharge.location}</strong>
            </div>
            {priseEnCharge.reservation.date_depart && (
              <div className="pec-row">
                <span className="label">Date départ :</span>
                <strong>{new Date(priseEnCharge.reservation.date_depart).toLocaleString('fr-FR')}</strong>
              </div>
            )}
          </div>
        </div>
        
        {priseEnCharge.agent && (
          <div className="pec-section">
            <h3>👨‍✈️ Agent Assigné</h3>
            <div className="pec-info-grid">
              <div className="pec-row">
                <span className="label">Nom :</span>
                <strong>{priseEnCharge.agent.surname} {priseEnCharge.agent.name}</strong>
              </div>
              <div className="pec-row">
                <span className="label">Entreprise :</span>
                <strong>{priseEnCharge.agent.entreprise}</strong>
              </div>
              {priseEnCharge.agent.phone && (
                <div className="pec-row">
                  <span className="label">Téléphone :</span>
                  <strong>{priseEnCharge.agent.phone}</strong>
                </div>
              )}
            </div>
          </div>
        )}
        
        {validated || priseEnCharge.status === 'validated' ? (
          <div className="pec-validated-section">
            <div className="pec-validated-icon">✅</div>
            <h3>Prise en charge validée</h3>
            <p className="pec-validated-date">
              Le {new Date(priseEnCharge.validated_at).toLocaleString('fr-FR')}
            </p>
            <p className="pec-validated-by">
              Par : <strong>{priseEnCharge.validated_by}</strong>
            </p>
            {priseEnCharge.notes && (
              <div className="pec-notes">
                <p><strong>Notes :</strong> {priseEnCharge.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <form className="pec-form" onSubmit={handleValidate}>
            <div className="pec-form-header">
              <h3>✍️ Validation de la prise en charge</h3>
              <p>Veuillez confirmer la prise en charge de ce passager PMR</p>
            </div>
            
            <div className="pec-form-group">
              <label htmlFor="agent_qr_public_id">
                QR Code Agent PMR <span className="required">*</span>
              </label>
              <input
                id="agent_qr_public_id"
                type="text"
                disabled={validating}
                value={agentQrPublicId}
                onChange={(e) => setAgentQrPublicId(e.target.value)}
                placeholder="Scannez ou collez le QR de l'agent"
                required
              />
              <small className="pec-hint">
                Le PMR doit saisir/coller le contenu du QR Code fourni par l’agent. Cette information sera enregistrée et visible par le passager.
              </small>
            </div>
            <button 
              type="submit" 
              disabled={validating || !agentQrPublicId.trim()} 
              className="pec-btn-validate"
            >
              {validating ? (
                <>
                  <span className="btn-spinner"></span>
                  Validation en cours...
                </>
              ) : (
                <>✅ Valider la prise en charge</>
              )}
            </button>
          </form>
        )}
        
        <div className="pec-footer">
          <p className="pec-footer-text">
            FlexiTrip - Système de prise en charge PMR
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriseEnChargeValidation;
