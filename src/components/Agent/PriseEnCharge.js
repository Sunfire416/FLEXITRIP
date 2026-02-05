import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import CarteSuivi from './CarteSuivi';
import '../../spinner.css';

function PriseEnCharge() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState(null);
  const [agent, setAgent] = useState(null);
  const [priseEnCharge, setPriseEnCharge] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [codesPmr, setCodesPmr] = useState([]);
  const [bagages, setBagages] = useState([]);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showBagageScanner, setShowBagageScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrBagageInput, setQrBagageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [reservationId]);

  const loadData = async () => {
    await loadAgent();
    await loadReservation();
    await loadPriseEnCharge();
    await loadEvenements();
    await loadCodesPmr();
    await loadBagages();
    setLoading(false);
  };

  const loadAgent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('agents_pmr')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setAgent(data);
  };

  const loadReservation = async () => {
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles(*),
        voyageurs_associes(*),
        etapes(*),
        enregistrements(*)
      `)
      .eq('id', reservationId)
      .single();
    setReservation(data);
  };

  const loadCodesPmr = async () => {
    const { data: reservation } = await supabase
      .from('reservations')
      .select('profile_id')
      .eq('id', reservationId)
      .single();

    if (reservation) {
      const { data } = await supabase
        .from('pmr_codes')
        .select('*')
        .eq('profile_id', reservation.profile_id)
        .eq('actif', true);
      
      setCodesPmr(data || []);
    }
  };

  const loadBagages = async () => {
    const { data: reservation } = await supabase
      .from('reservations')
      .select(`
        enregistrements(id)
      `)
      .eq('id', reservationId)
      .single();

    if (reservation?.enregistrements?.[0]) {
      const { data } = await supabase
        .from('bagages')
        .select('*')
        .eq('enregistrement_id', reservation.enregistrements[0].id)
        .order('created_at', { ascending: true });
      
      setBagages(data || []);
    }
  };

  const handleScanBagage = () => {
    setShowBagageScanner(true);
  };

  const handleBagageQRSubmit = async () => {
    try {
      // Dans une vraie app, on scannerait un QR code
      // Ici on accepte le code QR du bagage directement
      const qrCode = qrBagageInput.trim();
      
      // Trouver le bagage avec ce QR code
      const bagage = bagages.find(b => b.qrcode_bagage === qrCode);
      
      if (bagage) {
        // Mettre à jour le statut du bagage
        const newStatut = bagage.statut === 'enregistre' ? 'en_transit' : 'livre';
        
        await supabase
          .from('bagages')
          .update({ statut: newStatut })
          .eq('id', bagage.id);

        // Logger l'événement
        await supabase.from('evenements').insert({
          reservation_id: reservationId,
          agent_pmr_id: agent.id,
          type: 'scan_bagage',
          description: `Bagage scanné - Statut: ${newStatut}`,
          metadata: { qrcode: qrCode, statut: newStatut },
        });

        alert(`✅ Bagage scanné ! Statut: ${newStatut}`);
        await loadBagages();
        await loadEvenements();
        setShowBagageScanner(false);
        setQrBagageInput('');
      } else {
        alert('❌ QR Code bagage invalide !');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors du scan du bagage');
    }
  };

  const handleVerificationFaciale = async () => {
    if (!reservation?.profiles?.photo_url) {
      alert('❌ Aucune photo disponible pour ce passager');
      return;
    }

    setVerificationEnCours(true);
    setVerificationResult(null);

    try {
      // SIMULATION de reconnaissance faciale (2-3 secondes)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Résultat aléatoire (95% de succès pour fluidité démo)
      const success = Math.random() > 0.05;
      const confidence = success ? (Math.random() * 10 + 90).toFixed(1) : (Math.random() * 30 + 40).toFixed(1);

      const result = {
        success,
        confidence: parseFloat(confidence),
        message: success 
          ? `✅ Identité confirmée (${confidence}% de correspondance)`
          : `❌ Identité non confirmée (${confidence}% de correspondance)`,
      };

      // Logger l'événement
      await supabase.from('evenements').insert({
        reservation_id: reservationId,
        agent_pmr_id: agent.id,
        type: 'verification_faciale',
        description: result.message,
        metadata: { 
          success,
          confidence: parseFloat(confidence),
        },
      });

      setVerificationResult(result);
      await loadEvenements();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la vérification faciale');
    } finally {
      setVerificationEnCours(false);
    }
  };

  const loadPriseEnCharge = async () => {
    const { data: agentData } = await supabase
      .from('agents_pmr')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user.id)
      .single();

    const { data } = await supabase
      .from('prises_en_charge')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('agent_pmr_id', agentData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setPriseEnCharge(data);
  };

  const loadEvenements = async () => {
    const { data } = await supabase
      .from('evenements')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false });
    setEvenements(data || []);
  };

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleQRSubmit = async () => {
    try {
      const qrData = JSON.parse(qrInput);
      
      if (qrData.num_reza === reservation.num_reza_mmt) {
        alert('✅ QR Code valide ! Passager authentifié.');
        
        // Logger l'événement
        await supabase.from('evenements').insert({
          reservation_id: reservationId,
          agent_pmr_id: agent.id,
          type: 'scan_qr_passager',
          description: 'QR Code passager scanné et validé',
          metadata: { num_cemb: qrData.num_cemb },
        });

        // Démarrer prise en charge si pas encore démarrée
        if (!priseEnCharge || priseEnCharge.statut !== 'en_cours') {
          await debuterPriseEnCharge();
        }

        setShowScanner(false);
        setQrInput('');
        await loadEvenements();
      } else {
        alert('❌ QR Code invalide !');
      }
    } catch (error) {
      alert('❌ Erreur de lecture du QR Code');
    }
  };

  const debuterPriseEnCharge = async () => {
    const { data } = await supabase
      .from('prises_en_charge')
      .insert({
        reservation_id: reservationId,
        etape_id: reservation.etapes[0].id,
        agent_pmr_id: agent.id,
        statut: 'en_cours',
        prise_en_charge_debut: new Date().toISOString(),
      })
      .select()
      .single();

    setPriseEnCharge(data);

    await supabase.from('evenements').insert({
      reservation_id: reservationId,
      agent_pmr_id: agent.id,
      type: 'debut_prise_en_charge',
      description: 'Prise en charge débutée par l\'agent',
    });

    await loadEvenements();
  };

  const handleArretTemporaire = async (type) => {
    await supabase.from('prises_en_charge')
      .update({ statut: 'pause', type_arret: type })
      .eq('id', priseEnCharge.id);

    await supabase.from('evenements').insert({
      reservation_id: reservationId,
      agent_pmr_id: agent.id,
      type: 'arret_temporaire',
      description: `Arrêt temporaire: ${type}`,
      metadata: { type_arret: type },
    });

    alert(`⏸️ Arrêt temporaire enregistré: ${type}`);
    await loadPriseEnCharge();
    await loadEvenements();
  };

  const handleContinuerPriseEnCharge = async () => {
    await supabase.from('prises_en_charge')
      .update({ statut: 'en_cours', type_arret: null })
      .eq('id', priseEnCharge.id);

    await supabase.from('evenements').insert({
      reservation_id: reservationId,
      agent_pmr_id: agent.id,
      type: 'reprise_prise_en_charge',
      description: 'Reprise de la prise en charge',
    });

    await loadPriseEnCharge();
    await loadEvenements();
  };

  const handleTerminerPriseEnCharge = async () => {
    if (!window.confirm('Confirmer la fin de la prise en charge ?')) return;

    await supabase.from('prises_en_charge')
      .update({ 
        statut: 'terminee',
        prise_en_charge_fin: new Date().toISOString()
      })
      .eq('id', priseEnCharge.id);

    await supabase.from('evenements').insert({
      reservation_id: reservationId,
      agent_pmr_id: agent.id,
      type: 'fin_prise_en_charge',
      description: 'Prise en charge terminée avec succès',
    });

    alert('✅ Prise en charge terminée !');
    navigate('/');
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR - Agent</h1>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← Retour
        </button>
      </nav>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2>♿ Assistance en cours</h2>
          {priseEnCharge && (
            <div style={styles.status(priseEnCharge.statut)}>
              {priseEnCharge.statut === 'en_cours' ? '🟢 En cours' : 
               priseEnCharge.statut === 'pause' ? '⏸️ En pause' : '✅ Terminée'}
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {/* Carte passager */}
          <div style={styles.card}>
            <h3>👤 Informations passager</h3>
            
            {/* ÉTAPE 8 : Voyageur concerné */}
            {reservation.voyageurs_associes && (
              <div style={styles.voyageurSection}>
                <h4>👥 Voyageur concerné</h4>
                <p><strong>{reservation.voyageurs_associes.prenom} {reservation.voyageurs_associes.nom}</strong></p>
                <p style={styles.smallText}>Réservation faite par : {reservation.profiles.prenom} {reservation.profiles.nom}</p>
                
                {reservation.voyageurs_associes.codes_pmr && reservation.voyageurs_associes.codes_pmr.length > 0 && (
                  <div style={styles.codesList}>
                    <strong>Codes PMR :</strong>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'}}>
                      {reservation.voyageurs_associes.codes_pmr.map(code => (
                        <span key={code} style={styles.codeTag}>{code}</span>
                      ))}
                    </div>
                  </div>
                )}

                {reservation.voyageurs_associes.preferences_repas && (
                  <div style={styles.prefsRepas}>
                    <strong>Repas :</strong> {reservation.voyageurs_associes.preferences_repas.type_repas || 'Standard'}
                  </div>
                )}
              </div>
            )}

            {reservation.profiles.photo_url && (
              <div style={styles.photoVerificationSection}>
                <img 
                  src={reservation.profiles.photo_url} 
                  alt="Photo passager" 
                  style={styles.passagerPhoto}
                />
                
                <button 
                  onClick={handleVerificationFaciale}
                  disabled={verificationEnCours}
                  style={styles.verifyBtn}
                >
                  {verificationEnCours ? '🔄 Vérification en cours...' : '🔍 Vérifier l\'identité'}
                </button>

                {verificationEnCours && (
                  <div style={styles.verificationLoader}>
                    <div className="verification-spinner"></div>
                    <p>Analyse biométrique en cours...</p>
                  </div>
                )}

                {verificationResult && (
                  <div style={styles.verificationResult(verificationResult.success)}>
                    <strong>{verificationResult.message}</strong>
                    <div style={styles.confidenceBar}>
                      <div style={styles.confidenceFill(verificationResult.confidence, verificationResult.success)}>
                        {verificationResult.confidence}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={styles.infoSection}>
              <div style={styles.infoRow}>
                <strong>Nom:</strong> {reservation.profiles.prenom} {reservation.profiles.nom}
              </div>
              <div style={styles.infoRow}>
                <strong>Email:</strong> {reservation.profiles.email}
              </div>
              <div style={styles.infoRow}>
                <strong>Téléphone:</strong> {reservation.profiles.telephone || 'Non renseigné'}
              </div>
              <div style={styles.infoRow}>
                <strong>N° Réservation:</strong> {reservation.num_reza_mmt}
              </div>
              {reservation.enregistrements?.[0] && (
                <div style={styles.infoRow}>
                  <strong>N° Embarquement:</strong> {reservation.enregistrements[0].num_cemb_mmt}
                </div>
              )}
              
              {reservation.enregistrements?.[0]?.mode_enregistrement === 'offline' && (
                <div style={styles.offlineAlert}>
                  <strong>⚠️ ENREGISTREMENT OFFLINE</strong>
                  <p>Ce passager s'est enregistré en mode offline.</p>
                  <p>✅ Double vérification requise :</p>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li>Vérifier l'identité du passager</li>
                    <li>Contrôler les documents de voyage</li>
                    <li>Confirmer la synchronisation des données</li>
                  </ul>
                </div>
              )}
              
              {codesPmr.length > 0 && (
                <div style={styles.pmrSection}>
                  <strong>♿ Codes PMR:</strong>
                  <div style={styles.pmrCodes}>
                    {codesPmr.map((code) => (
                      <div key={code.id} style={styles.pmrCode}>
                        <strong>{code.code}</strong>
                        <p>{code.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {reservation.enregistrements?.[0]?.preferences_repas && 
               Object.keys(reservation.enregistrements[0].preferences_repas).length > 0 && (
                <div style={styles.repasSection}>
                  <strong>🍽️ Préférences repas:</strong>
                  <div style={styles.repasList}>
                    {reservation.enregistrements[0].preferences_repas.type_repas && (
                      <div style={styles.repasItem}>
                        <strong>Type:</strong> {reservation.enregistrements[0].preferences_repas.type_repas}
                      </div>
                    )}
                    {reservation.enregistrements[0].preferences_repas.allergenes?.length > 0 && (
                      <div style={styles.repasItem}>
                        <strong>Allergènes:</strong> {reservation.enregistrements[0].preferences_repas.allergenes.join(', ')}
                      </div>
                    )}
                    {reservation.enregistrements[0].preferences_repas.regime_special && (
                      <div style={styles.repasItem}>
                        <strong>Régime:</strong> {reservation.enregistrements[0].preferences_repas.regime_special}
                      </div>
                    )}
                    {reservation.enregistrements[0].preferences_repas.remarques && (
                      <div style={styles.repasItem}>
                        <strong>Remarques:</strong> {reservation.enregistrements[0].preferences_repas.remarques}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleScanQR} style={styles.scanBtn}>
              📷 Scanner QR Code Passager
            </button>

            {showScanner && (
              <div style={styles.scannerBox}>
                <h4>Scanner QR Code</h4>
                <textarea
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Collez les données du QR code ici..."
                  style={styles.qrInput}
                />
                <div style={styles.scannerActions}>
                  <button onClick={handleQRSubmit} style={styles.validateBtn}>
                    Valider
                  </button>
                  <button onClick={() => setShowScanner(false)} style={styles.cancelBtn}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {bagages.length > 0 && (
              <div style={styles.bagagesSection}>
                <h4>🧳 Bagages enregistrés ({bagages.length})</h4>
                {bagages.map((bagage) => (
                  <div key={bagage.id} style={styles.bagageItem}>
                    <div style={styles.bagageHeader}>
                      <span>
                        {bagage.type === 'soute' ? '🧳' : '🎒'} {bagage.type} - {bagage.poids}kg
                      </span>
                      <span style={styles.bagageStatut(bagage.statut)}>
                        {bagage.statut}
                      </span>
                    </div>
                    <div style={styles.bagageQr}>
                      QR: {bagage.qrcode_bagage}
                    </div>
                    {bagage.photo_url ? (
                      <img
                        src={bagage.photo_url}
                        alt="Bagage"
                        style={{ marginTop: 8, width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : null}
                  </div>
                ))}
                <button onClick={handleScanBagage} style={styles.scanBagageBtn}>
                  📦 Scanner un bagage
                </button>

                {showBagageScanner && (
                  <div style={styles.scannerBox}>
                    <h4>Scanner QR Code Bagage</h4>
                    <input
                      type="text"
                      value={qrBagageInput}
                      onChange={(e) => setQrBagageInput(e.target.value)}
                      placeholder="Code QR du bagage (ex: BAG-123...)"
                      style={styles.qrInput}
                    />
                    <div style={styles.scannerActions}>
                      <button onClick={handleBagageQRSubmit} style={styles.validateBtn}>
                        Valider
                      </button>
                      <button onClick={() => setShowBagageScanner(false)} style={styles.cancelBtn}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.card}>
            <h3>⚡ Actions rapides</h3>
            
            {!priseEnCharge || priseEnCharge.statut === 'en_attente' ? (
              <button onClick={debuterPriseEnCharge} style={styles.actionBtn}>
                🚀 Débuter la prise en charge
              </button>
            ) : priseEnCharge.statut === 'pause' ? (
              <button onClick={handleContinuerPriseEnCharge} style={styles.actionBtn}>
                ▶️ Reprendre l'assistance
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handleArretTemporaire('filtrage')}
                  style={styles.actionBtn}
                >
                  🛂 Arrêt: Filtrage sécurité
                </button>
                <button 
                  onClick={() => handleArretTemporaire('duty_free')}
                  style={styles.actionBtn}
                >
                  🛍️ Arrêt: Duty Free
                </button>
                <button 
                  onClick={() => handleArretTemporaire('toilette')}
                  style={styles.actionBtn}
                >
                  🚻 Arrêt: Toilettes
                </button>
                <button 
                  onClick={handleTerminerPriseEnCharge}
                  style={styles.terminateBtn}
                >
                  ✅ Terminer la prise en charge
                </button>
              </>
            )}
          </div>
        </div>

        {/* Carte de suivi GPS */}
        {agent && reservation && (
          <CarteSuivi agent={agent} reservation={reservation} />
        )}

        {/* Étapes du voyage */}
        <div style={styles.section}>
          <h3>🚉 Itinéraire ({reservation.etapes?.length} étapes)</h3>
          <div style={styles.timeline}>
            {reservation.etapes?.map((etape, index) => (
              <div key={etape.id} style={styles.timelineItem}>
                <div style={styles.timelineDot}>{index + 1}</div>
                <div style={styles.timelineContent}>
                  <div style={styles.etapeHeader}>
                    <strong>{getTransportIcon(etape.type_transport)} {etape.type_transport}</strong>
                    <span style={styles.etapeOperateur}>{etape.operateur}</span>
                  </div>
                  <div style={styles.etapeRoute}>
                    {etape.depart_lieu} → {etape.arrivee_lieu}
                  </div>
                  <div style={styles.etapeTime}>
                    ⏰ {new Date(etape.depart_heure).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline événements */}
        <div style={styles.section}>
          <h3>📊 Timeline des événements</h3>
          <div style={styles.eventsList}>
            {evenements.length === 0 ? (
              <p style={styles.noEvents}>Aucun événement enregistré</p>
            ) : (
              evenements.map((event) => (
                <div key={event.id} style={styles.eventItem}>
                  <div style={styles.eventTime}>
                    {new Date(event.created_at).toLocaleString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div style={styles.eventContent}>
                    <strong>{getEventIcon(event.type)} {event.type.replace(/_/g, ' ')}</strong>
                    <p>{event.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const getTransportIcon = (type) => {
  const icons = { train: '🚄', bus: '🚌', avion: '✈️', metro: '🚇', vtc: '🚗', taxi: '🚕' };
  return icons[type] || '🚉';
};

const getEventIcon = (type) => {
  const icons = {
    scan_qr_passager: '📷',
    debut_prise_en_charge: '🚀',
    arret_temporaire: '⏸️',
    reprise_prise_en_charge: '▶️',
    fin_prise_en_charge: '✅',
    enregistrement_online: '✈️',
    scan_bagage: '📦',
    verification_faciale: '🔍',
    synchronisation_enregistrement: '🔄',
  };
  return icons[type] || '📝';
};

const styles = {
  container: { minHeight: '100vh', background: '#f5f7fa' },
  nav: { background: 'white', padding: '20px 40px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { margin: 0, color: '#e67e22' },
  backBtn: { padding: '8px 16px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  status: (statut) => ({ padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', background: statut === 'en_cours' ? '#d4edda' : statut === 'pause' ? '#fff3cd' : '#d1ecf1', color: statut === 'en_cours' ? '#155724' : statut === 'pause' ? '#856404' : '#0c5460' }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' },
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  photoVerificationSection: { textAlign: 'center', marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' },
  passagerPhoto: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #667eea', marginBottom: '15px' },
  verifyBtn: { padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  verificationLoader: { marginTop: '20px', textAlign: 'center' },
  spinner: { border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' },
  verificationResult: (success) => ({ marginTop: '20px', padding: '15px', borderRadius: '8px', background: success ? '#d4edda' : '#f8d7da', color: success ? '#155724' : '#721c24', border: `2px solid ${success ? '#28a745' : '#dc3545'}` }),
  confidenceBar: { marginTop: '10px', height: '30px', background: '#e9ecef', borderRadius: '15px', overflow: 'hidden' },
  confidenceFill: (confidence, success) => ({ height: '100%', width: `${confidence}%`, background: success ? 'linear-gradient(90deg, #28a745, #20c997)' : 'linear-gradient(90deg, #dc3545, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', transition: 'width 0.5s ease' }),
  infoSection: { marginTop: '15px' },
  infoRow: { padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' },
  offlineAlert: { marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px', borderLeft: '4px solid #ff9800', fontSize: '14px' },
  pmrSection: { marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' },
  pmrCodes: { marginTop: '10px' },
  pmrCode: { padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #ffc107' },
  repasSection: { marginTop: '15px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' },
  repasList: { marginTop: '10px' },
  repasItem: { padding: '6px 0', fontSize: '14px' },
  bagagesSection: { marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' },
  bagageItem: { padding: '12px', background: 'white', borderRadius: '6px', marginBottom: '10px', border: '1px solid #ddd' },
  bagageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
  bagageStatut: (statut) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: statut === 'enregistre' ? '#d4edda' : statut === 'en_transit' ? '#cce5ff' : '#d1ecf1', color: statut === 'enregistre' ? '#155724' : statut === 'en_transit' ? '#004085' : '#0c5460' }),
  bagageQr: { fontSize: '12px', color: '#666', fontFamily: 'monospace' },
  scanBagageBtn: { width: '100%', padding: '10px', marginTop: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  scanBtn: { width: '100%', padding: '12px', marginTop: '20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  scannerBox: { marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' },
  qrInput: { width: '100%', minHeight: '100px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '10px', fontFamily: 'monospace' },
  scannerActions: { display: 'flex', gap: '10px', marginTop: '10px' },
  validateBtn: { flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  actionBtn: { width: '100%', padding: '12px', marginBottom: '10px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  terminateBtn: { width: '100%', padding: '12px', marginTop: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  section: { background: 'white', padding: '25px', borderRadius: '12px', marginBottom: '20px' },
  timeline: { marginTop: '20px' },
  timelineItem: { display: 'flex', gap: '15px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' },
  timelineDot: { width: '40px', height: '40px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 },
  timelineContent: { flex: 1 },
  etapeHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
  etapeOperateur: { color: '#666', fontSize: '14px' },
  etapeRoute: { fontSize: '14px', marginBottom: '5px' },
  etapeTime: { fontSize: '13px', color: '#666' },
  eventsList: { marginTop: '20px' },
  noEvents: { textAlign: 'center', color: '#999', padding: '20px' },
  eventItem: { display: 'flex', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px' },
  eventTime: { fontWeight: 'bold', color: '#667eea', minWidth: '60px' },
  eventContent: { flex: 1 },
  // ÉTAPE 8 : Styles voyageur associé
  voyageurSection: {
    background: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  smallText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  },
  codesList: {
    marginTop: '10px',
  },
  codeTag: {
    padding: '4px 10px',
    background: '#fff3cd',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#856404',
  },
  prefsRepas: {
    marginTop: '10px',
    fontSize: '14px',
  },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' },
};

export default PriseEnCharge;
