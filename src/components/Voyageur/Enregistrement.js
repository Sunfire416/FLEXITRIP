import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

function Enregistrement() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState(null);
  const [enregistrement, setEnregistrement] = useState(null);
  const [bagages, setBagages] = useState([]);
  const [newBagage, setNewBagage] = useState({
    type: 'soute',
    poids: '',
  });
  const [modeOffline, setModeOffline] = useState(false);
  const [enregistrementOffline, setEnregistrementOffline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadReservation();
    checkOfflineEnregistrement();
  }, [reservationId]);

  const checkOfflineEnregistrement = () => {
    const offlineKey = `offline_enreg_${reservationId}`;
    const offlineData = localStorage.getItem(offlineKey);
    if (offlineData) {
      setEnregistrementOffline(JSON.parse(offlineData));
    }
  };

  const loadReservation = async () => {
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        etapes(*),
        enregistrements(*),
        profiles(*)
      `)
      .eq('id', reservationId)
      .single();

    setReservation(data);
    
    if (data?.enregistrements?.length > 0) {
      setEnregistrement(data.enregistrements[0]);
      await loadBagages(data.enregistrements[0].id);
    }
    
    setLoading(false);
  };

  const loadBagages = async (enregistrementId) => {
    const { data } = await supabase
      .from('bagages')
      .select('*')
      .eq('enregistrement_id', enregistrementId)
      .order('created_at', { ascending: true });
    
    setBagages(data || []);
  };

  const handleAddBagage = async () => {
    if (!enregistrement) {
      alert('❌ Veuillez d\'abord effectuer l\'enregistrement');
      return;
    }

    if (!newBagage.poids || parseFloat(newBagage.poids) <= 0) {
      alert('❌ Veuillez saisir un poids valide');
      return;
    }

    try {
      // Générer QR code unique pour le bagage
      const qrcode_bagage = `BAG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Simuler une photo de bagage (URL fictive)
      const photo_url = `https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400`;

      const { data, error } = await supabase
        .from('bagages')
        .insert({
          enregistrement_id: enregistrement.id,
          type: newBagage.type,
          poids: parseFloat(newBagage.poids),
          qrcode_bagage,
          photo_url,
          statut: 'enregistre',
        })
        .select()
        .single();

      if (error) throw error;

      // Logger événement
      await supabase.from('evenements').insert({
        reservation_id: reservationId,
        type: 'enregistrement_bagage',
        description: `Bagage ${newBagage.type} enregistré (${newBagage.poids}kg)`,
        metadata: { qrcode: qrcode_bagage },
      });

      await loadBagages(enregistrement.id);
      setNewBagage({ type: 'soute', poids: '' });
      alert('✅ Bagage enregistré avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'enregistrement du bagage');
    }
  };

  const handleRemoveBagage = async (bagageId) => {
    if (!window.confirm('Supprimer ce bagage ?')) return;

    try {
      const { error } = await supabase
        .from('bagages')
        .delete()
        .eq('id', bagageId);

      if (error) throw error;

      await loadBagages(enregistrement.id);
      alert('✅ Bagage supprimé');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleEnregistrement = async () => {
    setProcessing(true);

    try {
      // Récupérer les préférences repas du profil
      const { data: profilePrefs } = await supabase
        .from('profiles')
        .select('preferences_repas')
        .eq('id', reservation.profile_id)
        .single();

      // Générer numéro carte embarquement
      const num_cemb_mmt = `CEMB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Créer QR code data (format JSON chiffré simulé)
      const qrData = {
        num_cemb: num_cemb_mmt,
        num_reza: reservation.num_reza_mmt,
        nom: reservation.profiles.nom,
        prenom: reservation.profiles.prenom,
        depart: reservation.depart_lieu,
        arrivee: reservation.arrivee_lieu,
        date: reservation.date_depart,
        assistance_pmr: reservation.assistance_pmr,
      };

      const enregistrementData = {
        reservation_id: reservationId,
        profile_id: reservation.profile_id,
        num_cemb_mmt,
        qrcode_embarquement: JSON.stringify(qrData),
        mode_enregistrement: modeOffline ? 'offline' : 'online',
        preferences_repas: profilePrefs?.preferences_repas || {},
      };

      if (modeOffline) {
        // MODE OFFLINE : Sauvegarder localement
        const offlineKey = `offline_enreg_${reservationId}`;
        const offlineEnreg = {
          ...enregistrementData,
          id: `offline_${Date.now()}`,
          created_at: new Date().toISOString(),
          synced: false,
        };
        
        localStorage.setItem(offlineKey, JSON.stringify(offlineEnreg));
        setEnregistrementOffline(offlineEnreg);
        setEnregistrement(offlineEnreg);
        
        alert('✅ Enregistrement sauvegardé localement (mode offline) !\n\n⚠️ Synchronisation nécessaire avant le départ.');
      } else {
        // MODE ONLINE : Insérer directement dans Supabase
        const { data: newEnreg, error } = await supabase
          .from('enregistrements')
          .insert(enregistrementData)
          .select()
          .single();

        if (error) throw error;

        // Logger événement
        await supabase.from('evenements').insert({
          reservation_id: reservationId,
          type: 'enregistrement_online',
          description: 'Enregistrement en ligne effectué',
          metadata: { num_cemb: num_cemb_mmt },
        });

        setEnregistrement(newEnreg);
        alert('✅ Enregistrement réussi !');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'enregistrement');
    } finally {
      setProcessing(false);
    }
  };

  const handleSynchroniser = async () => {
    if (!enregistrementOffline || enregistrementOffline.synced) {
      alert('Rien à synchroniser');
      return;
    }

    setProcessing(true);

    try {
      // Supprimer les champs offline
      const { id, created_at, synced, ...dataToSync } = enregistrementOffline;
      
      // Insérer dans Supabase
      const { data: newEnreg, error } = await supabase
        .from('enregistrements')
        .insert(dataToSync)
        .select()
        .single();

      if (error) throw error;

      // Logger événement
      await supabase.from('evenements').insert({
        reservation_id: reservationId,
        type: 'synchronisation_enregistrement',
        description: 'Enregistrement offline synchronisé',
        metadata: { num_cemb: enregistrementOffline.num_cemb_mmt },
      });

      // Supprimer du localStorage
      const offlineKey = `offline_enreg_${reservationId}`;
      localStorage.removeItem(offlineKey);
      
      setEnregistrement(newEnreg);
      setEnregistrementOffline(null);
      await loadBagages(newEnreg.id);
      
      alert('✅ Synchronisation réussie !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la synchronisation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  if (!reservation) {
    return <div style={styles.loading}>Réservation introuvable</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button onClick={() => navigate('/mes-voyages')} style={styles.backBtn}>
          ← Retour
        </button>
      </nav>

      <div style={styles.content}>
        {enregistrement ? (
          // Carte d'embarquement
          <div>
            <h2>✅ Enregistrement confirmé</h2>
            <p style={styles.subtitle}>Voici votre carte d'embarquement</p>

            <div style={styles.boardingPass}>
              <div style={styles.bpHeader}>
                <h3>🎫 CARTE D'EMBARQUEMENT</h3>
                <p style={styles.bpSubtitle}>Voyage multimodal MMT PMR</p>
                {enregistrementOffline && !enregistrementOffline.synced && enregistrement?.mode_enregistrement === 'offline' && (
                  <div style={styles.offlineBadge}>
                    ⚠️ NON SYNCHRONISÉ
                  </div>
                )}
              </div>

              {enregistrementOffline && !enregistrement?.id?.startsWith('offline') === false && (
                <div style={styles.syncAlert}>
                  <strong>⚠️ Enregistrement en mode offline</strong>
                  <p>Vos données sont sauvegardées localement. Synchronisez-les dès que possible.</p>
                  <button 
                    onClick={handleSynchroniser}
                    disabled={processing}
                    style={styles.syncBtn}
                  >
                    {processing ? '⏳ Synchronisation...' : '🔄 Synchroniser maintenant'}
                  </button>
                </div>
              )}

              <div style={styles.bpBody}>
                <div style={styles.bpInfo}>
                  <div style={styles.bpRow}>
                    <div style={styles.bpField}>
                      <label>Passager</label>
                      <strong>{reservation.profiles.prenom} {reservation.profiles.nom}</strong>
                    </div>
                    <div style={styles.bpField}>
                      <label>N° Carte embarquement</label>
                      <strong>{enregistrement.num_cemb_mmt}</strong>
                    </div>
                  </div>

                  <div style={styles.bpRow}>
                    <div style={styles.bpField}>
                      <label>Départ</label>
                      <strong>{reservation.depart_lieu}</strong>
                    </div>
                    <div style={styles.bpField}>
                      <label>Arrivée</label>
                      <strong>{reservation.arrivee_lieu}</strong>
                    </div>
                  </div>

                  <div style={styles.bpRow}>
                    <div style={styles.bpField}>
                      <label>Date de départ</label>
                      <strong>
                        {new Date(reservation.date_depart).toLocaleString('fr-FR')}
                      </strong>
                    </div>
                    {reservation.assistance_pmr && (
                      <div style={styles.bpField}>
                        <label>Assistance</label>
                        <strong style={{ color: '#e67e22' }}>♿ PMR activée</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.qrSection}>
                  <QRCodeSVG 
                    value={enregistrement.qrcode_embarquement}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <p style={styles.qrHint}>
                    Présentez ce QR code à chaque étape de votre voyage
                  </p>
                </div>
              </div>

              {reservation.assistance_pmr && (
                <div style={styles.assistanceInfo}>
                  <h4>♿ Assistance PMR</h4>
                  <p>Un agent vous accompagnera à chaque étape de votre voyage.</p>
                  <p>Vous serez contacté 30 minutes avant chaque départ.</p>
                </div>
              )}
              
              {/* NOUVEAU : Bouton Gérer mes taxis - APRÈS enregistrement */}
              {reservation.multimodal && reservation.etapes?.some(e => e.type_transport === 'taxi') && (
                <div style={styles.taxiSection}>
                  <button
                    onClick={() => navigate(`/prise-en-charge-taxi/${reservation.id}`)}
                    style={styles.taxiBtn}
                  >
                    🚕 Gérer mes taxis
                  </button>
                  <p style={styles.taxiNote}>
                    Suivez vos taxis en temps réel avec GPS
                  </p>
                </div>
              )}
            </div>

            <div style={styles.bagagesSection}>
              <h3>🧳 Mes bagages</h3>
              
              {bagages.length === 0 ? (
                <p style={styles.hint}>Aucun bagage enregistré</p>
              ) : (
                <div style={styles.bagagesList}>
                  {bagages.map((bagage) => (
                    <div key={bagage.id} style={styles.bagageCard}>
                      <div style={styles.bagageHeader}>
                        <span style={styles.bagageType}>
                          {bagage.type === 'soute' ? '🧳' : '🎒'} {bagage.type.toUpperCase()}
                        </span>
                        <span style={styles.bagageStatut(bagage.statut)}>
                          {bagage.statut}
                        </span>
                      </div>
                      <div style={styles.bagageInfo}>
                        <strong>Poids :</strong> {bagage.poids} kg
                      </div>
                      <div style={styles.bagageInfo}>
                        <strong>QR Code :</strong> {bagage.qrcode_bagage}
                      </div>
                      {bagage.photo_url && (
                        <img src={bagage.photo_url} alt="Bagage" style={styles.bagagePhoto} />
                      )}
                      <button 
                        onClick={() => handleRemoveBagage(bagage.id)}
                        style={styles.removeBagageBtn}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.addBagageForm}>
                <h4>➕ Ajouter un bagage</h4>
                <div style={styles.bagageFormRow}>
                  <select
                    value={newBagage.type}
                    onChange={(e) => setNewBagage({...newBagage, type: e.target.value})}
                    style={styles.bagageSelect}
                  >
                    <option value="soute">🧳 Soute</option>
                    <option value="cabine">🎒 Cabine</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Poids (kg)"
                    value={newBagage.poids}
                    onChange={(e) => setNewBagage({...newBagage, poids: e.target.value})}
                    style={styles.bagageInput}
                    min="0"
                    step="0.1"
                  />
                  <button onClick={handleAddBagage} style={styles.addBagageBtn}>
                    ✅ Ajouter
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.etapesSection}>
              <h3>🚉 Détail des étapes</h3>
              {reservation.etapes?.map((etape, index) => (
                <div key={etape.id} style={styles.etapeCard}>
                  <div style={styles.etapeNumber}>Étape {etape.ordre}</div>
                  <div style={styles.etapeContent}>
                    <div style={styles.etapeType}>
                      {getTransportIcon(etape.type_transport)} {etape.type_transport.toUpperCase()}
                    </div>
                    <div style={styles.etapeRoute}>
                      {etape.depart_lieu} → {etape.arrivee_lieu}
                    </div>
                    <div style={styles.etapeOperateur}>
                      Opérateur: {etape.operateur}
                    </div>
                    <div style={styles.etapeHeure}>
                      ⏰ {new Date(etape.depart_heure).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div style={styles.etapeStatus(etape.statut)}>
                    {etape.statut}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Formulaire d'enregistrement
          <div>
            <h2>✈️ Enregistrement en ligne</h2>
            <p style={styles.subtitle}>Réservation {reservation.num_reza_mmt}</p>

            <div style={styles.infoCard}>
              <h3>📋 Résumé du voyage</h3>
              <div style={styles.summaryRow}>
                <strong>Départ:</strong> {reservation.depart_lieu}
              </div>
              <div style={styles.summaryRow}>
                <strong>Arrivée:</strong> {reservation.arrivee_lieu}
              </div>
              <div style={styles.summaryRow}>
                <strong>Date:</strong> {new Date(reservation.date_depart).toLocaleString('fr-FR')}
              </div>
              <div style={styles.summaryRow}>
                <strong>Étapes:</strong> {reservation.etapes?.length || 0}
              </div>
              {reservation.assistance_pmr && (
                <div style={styles.assistanceTag}>♿ Assistance PMR activée</div>
              )}
            </div>

            <div style={styles.instructionsCard}>
              <h3>ℹ️ Instructions</h3>
              <ul style={styles.list}>
                <li>Vérifiez vos informations personnelles</li>
                <li>Un QR code unique sera généré pour tout votre voyage</li>
                <li>Présentez ce QR code à chaque étape</li>
                {reservation.assistance_pmr && (
                  <li><strong>Un agent PMR vous contactera avant le départ</strong></li>
                )}
              </ul>
            </div>

            <div style={styles.modeCard}>
              <h3>📡 Mode d'enregistrement</h3>
              <label style={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={modeOffline}
                  onChange={(e) => setModeOffline(e.target.checked)}
                />
                <span style={{ marginLeft: '10px' }}>
                  Mode offline (sans connexion internet)
                </span>
              </label>
              {modeOffline && (
                <div style={styles.offlineWarning}>
                  ⚠️ <strong>Mode offline activé</strong>
                  <p>Vos données seront sauvegardées localement et devront être synchronisées avant votre départ.</p>
                  <p>Une double vérification sera nécessaire à l'arrivée à la première étape.</p>
                </div>
              )}
            </div>

            <button 
              onClick={handleEnregistrement}
              disabled={processing}
              style={styles.enregBtn}
            >
              {processing ? '⏳ Enregistrement en cours...' : modeOffline ? '💾 Enregistrer localement (offline)' : '✅ Confirmer l\'enregistrement'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const getTransportIcon = (type) => {
  const icons = {
    train: '🚄',
    bus: '🚌',
    avion: '✈️',
    metro: '🚇',
    vtc: '🚗',
    taxi: '🚕',
  };
  return icons[type] || '🚉';
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
  },
  boardingPass: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    marginBottom: '30px',
  },
  bpHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px',
    textAlign: 'center',
  },
  bpSubtitle: {
    margin: '10px 0 0 0',
    opacity: 0.9,
  },
  bpBody: {
    display: 'flex',
    padding: '30px',
    gap: '30px',
  },
  bpInfo: {
    flex: 1,
  },
  bpRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
  },
  bpField: {
    flex: 1,
  },
  qrSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  qrHint: {
    marginTop: '15px',
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    maxWidth: '200px',
  },
  assistanceInfo: {
    background: '#fff3cd',
    padding: '20px',
    borderTop: '1px solid #ffc107',
  },
  bagagesSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginTop: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  bagagesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px',
    marginTop: '15px',
    marginBottom: '20px',
  },
  bagageCard: {
    border: '2px solid #e3f2fd',
    borderRadius: '8px',
    padding: '15px',
    background: '#f8f9fa',
  },
  bagageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  bagageType: {
    fontWeight: 'bold',
    fontSize: '16px',
  },
  bagageStatut: (statut) => ({
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    background: 
      statut === 'enregistre' ? '#d4edda' :
      statut === 'en_transit' ? '#cce5ff' :
      statut === 'livre' ? '#d1ecf1' : '#f8d7da',
    color: 
      statut === 'enregistre' ? '#155724' :
      statut === 'en_transit' ? '#004085' :
      statut === 'livre' ? '#0c5460' : '#721c24',
  }),
  bagageInfo: {
    fontSize: '14px',
    margin: '6px 0',
  },
  bagagePhoto: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '6px',
    marginTop: '10px',
  },
  removeBagageBtn: {
    width: '100%',
    padding: '8px',
    marginTop: '10px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  addBagageForm: {
    marginTop: '25px',
    padding: '20px',
    background: '#e3f2fd',
    borderRadius: '8px',
  },
  bagageFormRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  bagageSelect: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  bagageInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  addBagageBtn: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  etapesSection: {
    marginTop: '40px',
  },
  etapeCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  etapeNumber: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  etapeContent: {
    flex: 1,
  },
  etapeType: {
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  etapeRoute: {
    fontSize: '14px',
    marginBottom: '5px',
  },
  etapeOperateur: {
    fontSize: '13px',
    color: '#666',
  },
  etapeHeure: {
    fontSize: '13px',
    color: '#666',
    marginTop: '5px',
  },
  etapeStatus: (statut) => ({
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    background: statut === 'reservee' ? '#d4edda' : '#cce5ff',
    color: statut === 'reservee' ? '#155724' : '#004085',
  }),
  infoCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  summaryRow: {
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  assistanceTag: {
    marginTop: '15px',
    padding: '10px',
    background: '#fff3cd',
    color: '#856404',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  instructionsCard: {
    background: '#e3f2fd',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  list: {
    marginTop: '15px',
    paddingLeft: '20px',
  },
  modeCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '2px solid #667eea',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    cursor: 'pointer',
  },
  offlineWarning: {
    marginTop: '15px',
    padding: '15px',
    background: '#fff3cd',
    borderRadius: '8px',
    borderLeft: '4px solid #ffc107',
    fontSize: '14px',
  },
  offlineBadge: {
    marginTop: '10px',
    padding: '8px 16px',
    background: '#ff9800',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  syncAlert: {
    background: '#fff3cd',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #ffc107',
  },
  syncBtn: {
    marginTop: '15px',
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  enregBtn: {
    width: '100%',
    padding: '18px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  // NOUVEAU : Styles section taxi
  taxiSection: {
    marginTop: '20px',
    padding: '20px',
    background: '#fff3cd',
    borderRadius: '8px',
    textAlign: 'center',
    borderLeft: '4px solid #ffc107',
  },
  taxiBtn: {
    padding: '12px 30px',
    background: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(255, 193, 7, 0.3)',
  },
  taxiNote: {
    marginTop: '10px',
    fontSize: '13px',
    color: '#856404',
    margin: '10px 0 0 0',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
};

export default Enregistrement;