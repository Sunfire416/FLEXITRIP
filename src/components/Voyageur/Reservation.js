import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Reservation() {
  const [profile, setProfile] = useState(null);
  const [voyageurs, setVoyageurs] = useState([]);
  const [formData, setFormData] = useState({
    depart_lieu: '',
    arrivee_lieu: '',
    date_depart: '',
    multimodal: false,
    assistance_pmr: false,
    transports: ['train'],
    voyageur_associe_id: null,
  });
  const [loading, setLoading] = useState(false);
  
  // NOUVEAUX ÉTATS POUR TEMPLATES
  const [templateDetecte, setTemplateDetecte] = useState(null);
  const [etapesTemplate, setEtapesTemplate] = useState([]);
  const [modeTemplate, setModeTemplate] = useState(false);
  const [rechercheTemplateEnCours, setRechercheTemplateEnCours] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setProfile(data);
    
    if (user) {
      const { data: voyageursData } = await supabase
        .from('voyageurs_associes')
        .select('*')
        .eq('user_id', user.id)
        .order('prenom');
      setVoyageurs(voyageursData || []);
    }
  };

  // FONCTION DE RECHERCHE DE TEMPLATE
  const rechercherTemplate = async (depart, arrivee) => {
    if (!depart || !arrivee || depart.length < 3 || arrivee.length < 3) {
      setTemplateDetecte(null);
      setEtapesTemplate([]);
      setModeTemplate(false);
      return;
    }

    try {
      setRechercheTemplateEnCours(true);
      console.log('🔍 Recherche template:', { depart, arrivee });

      // Rechercher un template correspondant
      const { data: templates, error: templateError } = await supabase
        .from('itineraires_templates')
        .select('*')
        .ilike('depart_lieu', `%${depart}%`)
        .ilike('arrivee_lieu', `%${arrivee}%`)
        .eq('actif', true)
        .limit(1);

      if (templateError) throw templateError;

      if (templates && templates.length > 0) {
        const template = templates[0];
        console.log('✅ Template trouvé:', template);

        // Charger les étapes du template
        const { data: etapes, error: etapesError } = await supabase
          .from('itineraires_templates_etapes')
          .select('*')
          .eq('template_id', template.id)
          .order('ordre');

        if (etapesError) throw etapesError;

        console.log('📋 Étapes chargées:', etapes);

        setTemplateDetecte(template);
        setEtapesTemplate(etapes || []);
        setModeTemplate(true);
        setFormData(prev => ({ ...prev, multimodal: true }));
      } else {
        console.log('ℹ️ Aucun template trouvé');
        setTemplateDetecte(null);
        setEtapesTemplate([]);
        setModeTemplate(false);
      }
    } catch (error) {
      console.error('❌ Erreur recherche template:', error);
    } finally {
      setRechercheTemplateEnCours(false);
    }
  };

  // DEBOUNCE : Rechercher template automatiquement après 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.depart_lieu && formData.arrivee_lieu) {
        rechercherTemplate(formData.depart_lieu, formData.arrivee_lieu);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.depart_lieu, formData.arrivee_lieu]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleTransportChange = (index, value) => {
    const newTransports = [...formData.transports];
    newTransports[index] = value;
    setFormData({ ...formData, transports: newTransports });
  };

  const addTransport = () => {
    setFormData({
      ...formData,
      transports: [...formData.transports, 'train'],
    });
  };

  const removeTransport = (index) => {
    const newTransports = formData.transports.filter((_, i) => i !== index);
    setFormData({ ...formData, transports: newTransports });
  };

  const genererFacture = async (reservationId, profileId, reservationData) => {
    try {
      console.log('🚀 Début génération facture');
      
      let montant_ht = 0;
      const details = {};

      if (reservationData.assistance_pmr) {
        details.tarif_base = 25;
        montant_ht += 25;
      }

      if (reservationData.multimodal && reservationData.transports.length > 1) {
        const nb_etapes = reservationData.transports.length;
        details.nb_etapes = nb_etapes;
        details.tarif_multimodal = (nb_etapes - 1) * 15;
        montant_ht += details.tarif_multimodal;
      }

      if (reservationData.assistance_pmr) {
        details.tarif_assistance_speciale = 10;
        montant_ht += 10;
      }

      const montant_tva = montant_ht * 0.20;
      const montant_ttc = montant_ht + montant_tva;

      const num_facture = `FACT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const factureData = {
        reservation_id: reservationId,
        profile_id: profileId,
        num_facture: num_facture,
        montant_ht: montant_ht,
        montant_tva: montant_tva,
        montant_ttc: montant_ttc,
        statut: 'en_attente',
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: `Assistance PMR - ${reservationData.depart_lieu} → ${reservationData.arrivee_lieu}`,
        details: details,
      };

      const { data: facture, error } = await supabase
        .from('factures')
        .insert(factureData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur insert facture:', error);
        throw error;
      }

      console.log('✅ Facture créée:', facture);
      return facture;
    } catch (error) {
      console.error('❌ Erreur génération facture:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📝 Début création réservation');
      console.log('🎯 Mode template:', modeTemplate);

      const { data: { user } } = await supabase.auth.getUser();
      const num_reza_mmt = `MMT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Créer la réservation
      const { data: reservation, error: resaError } = await supabase
        .from('reservations')
        .insert({
          profile_id: profile.id,
          user_id: user.id,
          voyageur_associe_id: formData.voyageur_associe_id,
          num_reza_mmt,
          depart_lieu: formData.depart_lieu,
          arrivee_lieu: formData.arrivee_lieu,
          date_depart: new Date(formData.date_depart).toISOString(),
          multimodal: formData.multimodal,
          assistance_pmr: formData.assistance_pmr,
          statut: 'confirmee',
          prix_total: modeTemplate ? templateDetecte.prix_estime : (Math.random() * 200 + 50).toFixed(2),
        })
        .select()
        .single();

      if (resaError) throw resaError;
      console.log('✅ Réservation créée:', reservation);

      // MODE TEMPLATE : Créer les étapes enrichies
      if (modeTemplate && etapesTemplate.length > 0) {
        console.log('🎨 Création étapes depuis template');

        const dateDepart = new Date(formData.date_depart);
        
        const etapesData = etapesTemplate.map((etape) => {
          // Calculer horaires
          const depart_heure = new Date(dateDepart.getTime() + etape.delai_depuis_debut_minutes * 60000);
          const arrivee_heure = new Date(depart_heure.getTime() + etape.duree_minutes * 60000);

          return {
            reservation_id: reservation.id,
            ordre: etape.ordre,
            type_transport: etape.type_transport,
            operateur: etape.operateur,
            num_reza_operateur: `${etape.operateur?.toUpperCase() || 'MMT'}-${Date.now()}-${etape.ordre}`,
            depart_lieu: etape.depart_lieu,
            arrivee_lieu: etape.arrivee_lieu,
            depart_heure: depart_heure.toISOString(),
            arrivee_heure_prevue: arrivee_heure.toISOString(),
            duree_minutes: etape.duree_minutes,
            distance_km: etape.distance_km,
            ligne_transport: etape.ligne_transport,
            numero_transport: etape.numero_transport,
            prix_segment: etape.prix_segment,
            metadata_json: etape.metadata_json,
            statut: 'reservee',
          };
        });

        const { error: etapesError } = await supabase
          .from('etapes')
          .insert(etapesData);

        if (etapesError) throw etapesError;
        console.log('✅ Étapes template créées:', etapesData.length);

      } else {
        // MODE MANUEL : Création classique
        console.log('🔧 Création étapes mode manuel');

        const etapesData = formData.transports.map((transport, index) => ({
          reservation_id: reservation.id,
          ordre: index + 1,
          type_transport: transport,
          operateur: getOperateur(transport),
          num_reza_operateur: `${getOperateur(transport).toUpperCase()}-${Date.now()}-${index}`,
          depart_lieu: index === 0 ? formData.depart_lieu : `Gare Intermédiaire ${index}`,
          arrivee_lieu: index === formData.transports.length - 1 ? formData.arrivee_lieu : `Gare Intermédiaire ${index + 1}`,
          depart_heure: new Date(new Date(formData.date_depart).getTime() + index * 2 * 60 * 60 * 1000).toISOString(),
          statut: 'reservee',
        }));

        const { error: etapesError } = await supabase
          .from('etapes')
          .insert(etapesData);

        if (etapesError) throw etapesError;
        console.log('✅ Étapes manuelles créées');
      }

      // Générer facture si assistance PMR
      if (formData.assistance_pmr) {
        await genererFacture(reservation.id, profile.id, formData);
      }

      alert(`✅ Réservation confirmée !\n\nNuméro: ${num_reza_mmt}`);
      navigate('/mes-voyages');
    } catch (error) {
      console.error('❌ Erreur réservation:', error);
      alert('❌ Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getOperateur = (transport) => {
    const operateurs = {
      train: 'SNCF',
      bus: 'RATP',
      avion: 'Air France',
      metro: 'RATP',
      vtc: 'Uber',
      taxi: 'G7',
    };
    return operateurs[transport] || 'MMT';
  };

  const getTransportIcon = (type) => {
    const icons = {
      taxi: '🚕',
      train: '🚄',
      bus: '🚌',
      avion: '✈️',
      metro: '🚇',
      vtc: '🚗',
    };
    return icons[type] || '🚆';
  };

  const formatDuree = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${heures}h${mins.toString().padStart(2, '0')}` : `${heures}h`;
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Retour</button>
      </nav>

      <div style={styles.content}>
        <h2>➕ Nouvelle réservation</h2>
        <p style={styles.subtitle}>Planifiez votre voyage multimodal</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>🚉 Lieu de départ</label>
            <input
              type="text"
              name="depart_lieu"
              value={formData.depart_lieu}
              onChange={handleChange}
              placeholder="Ex: Paris, Champs-Élysées"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>🎯 Lieu d'arrivée</label>
            <input
              type="text"
              name="arrivee_lieu"
              value={formData.arrivee_lieu}
              onChange={handleChange}
              placeholder="Ex: Marseille, Stade Vélodrome"
              style={styles.input}
              required
            />
          </div>

          {/* AFFICHAGE RECHERCHE EN COURS */}
          {rechercheTemplateEnCours && (
            <div style={styles.rechercheEnCours}>
              🔍 Recherche d'itinéraires optimisés...
            </div>
          )}

          {/* CARTE VIOLETTE - TEMPLATE DÉTECTÉ */}
          {modeTemplate && templateDetecte && etapesTemplate.length > 0 && (
            <div style={styles.templateCard}>
              <div style={styles.templateHeader}>
                <h3 style={styles.templateTitle}>✨ Itinéraire optimisé détecté</h3>
                <span style={styles.templateBadge}>Recommandé</span>
              </div>

              <div style={styles.templateInfo}>
                <div style={styles.templateInfoRow}>
                  <span>📍 {templateDetecte.nom}</span>
                </div>
                <div style={styles.templateInfoRow}>
                  <span>⏱️ Durée totale : {formatDuree(templateDetecte.duree_totale_minutes)}</span>
                  <span>💰 Prix estimé : {templateDetecte.prix_estime?.toFixed(2)} €</span>
                </div>
              </div>

              <div style={styles.etapesList}>
                {etapesTemplate.map((etape, index) => (
                  <div key={etape.id} style={styles.etapeItem}>
                    <div style={styles.etapeIcone}>
                      {getTransportIcon(etape.type_transport)}
                    </div>
                    <div style={styles.etapeContent}>
                      <div style={styles.etapeHeader}>
                        <strong>Étape {index + 1} : {etape.type_transport.toUpperCase()}</strong>
                        {etape.numero_transport && (
                          <span style={styles.etapeNumero}>{etape.numero_transport}</span>
                        )}
                      </div>
                      <div style={styles.etapeTrajet}>
                        {etape.depart_lieu} → {etape.arrivee_lieu}
                      </div>
                      <div style={styles.etapeDetails}>
                        <span>⏱️ {formatDuree(etape.duree_minutes)}</span>
                        <span>📏 {etape.distance_km} km</span>
                        <span>💰 {etape.prix_segment?.toFixed(2)} €</span>
                      </div>
                      {etape.operateur && (
                        <div style={styles.etapeOperateur}>
                          Opérateur : {etape.operateur}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.templateFooter}>
                <p style={styles.templateNote}>
                  ℹ️ Cet itinéraire a été optimisé pour les PMR avec des correspondances facilitées
                </p>
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label>📅 Date de départ</label>
            <input
              type="datetime-local"
              name="date_depart"
              value={formData.date_depart}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                name="multimodal"
                checked={formData.multimodal}
                onChange={handleChange}
                disabled={modeTemplate}
              />
              <span>🔄 Voyage multimodal (plusieurs transports)</span>
            </label>

            <label style={styles.checkbox}>
              <input
                type="checkbox"
                name="assistance_pmr"
                checked={formData.assistance_pmr}
                onChange={handleChange}
              />
              <span>♿ Assistance PMR nécessaire</span>
            </label>
          </div>

          {voyageurs.length > 0 && (
            <div style={styles.formGroup}>
              <label>👥 Réserver pour :</label>
              <select
                value={formData.voyageur_associe_id || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  voyageur_associe_id: e.target.value === '' ? null : e.target.value
                })}
                style={styles.input}
              >
                <option value="">Moi-même ({profile?.prenom} {profile?.nom})</option>
                {voyageurs.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.prenom} {v.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* MODE MANUEL - Sélection transports */}
          {!modeTemplate && (
            <div style={styles.section}>
              <h3>🚄 Moyens de transport</h3>
              {formData.transports.map((transport, index) => (
                <div key={index} style={styles.transportRow}>
                  <span style={styles.stepNumber}>Étape {index + 1}</span>
                  <select
                    value={transport}
                    onChange={(e) => handleTransportChange(index, e.target.value)}
                    style={styles.select}
                  >
                    <option value="train">🚄 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="avion">✈️ Avion</option>
                    <option value="metro">🚇 Métro</option>
                    <option value="vtc">🚗 VTC</option>
                    <option value="taxi">🚕 Taxi</option>
                  </select>
                  {formData.transports.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTransport(index)}
                      style={styles.removeBtn}
                    >
                      ❌
                    </button>
                  )}
                </div>
              ))}
              {formData.multimodal && (
                <button
                  type="button"
                  onClick={addTransport}
                  style={styles.addBtn}
                >
                  ➕ Ajouter une étape
                </button>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Réservation en cours...' : '🎫 Confirmer la réservation'}
          </button>
        </form>
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
  },
  form: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '5px',
  },
  rechercheEnCours: {
    padding: '15px',
    background: '#e3f2fd',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#1976d2',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  // STYLES CARTE TEMPLATE
  templateCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    color: 'white',
    boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
  },
  templateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  templateTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  templateBadge: {
    background: 'rgba(255,255,255,0.3)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  templateInfo: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
  },
  templateInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  etapesList: {
    background: 'white',
    borderRadius: '8px',
    padding: '15px',
  },
  etapeItem: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '10px',
    color: '#333',
  },
  etapeIcone: {
    fontSize: '32px',
    flexShrink: 0,
  },
  etapeContent: {
    flex: 1,
  },
  etapeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  etapeNumero: {
    background: '#667eea',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  etapeTrajet: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  etapeDetails: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#999',
  },
  etapeOperateur: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px',
  },
  templateFooter: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(255,255,255,0.3)',
  },
  templateNote: {
    margin: 0,
    fontSize: '13px',
    opacity: 0.9,
  },
  checkboxGroup: {
    marginBottom: '20px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '14px',
  },
  section: {
    marginTop: '30px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  transportRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  stepNumber: {
    fontWeight: 'bold',
    minWidth: '70px',
  },
  select: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  removeBtn: {
    padding: '8px 12px',
    background: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  addBtn: {
    marginTop: '10px',
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '30px',
  },
};

export default Reservation;