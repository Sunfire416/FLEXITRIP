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
    
    // ÉTAPE 8 : Charger les voyageurs associés
    if (user) {
      const { data: voyageursData } = await supabase
        .from('voyageurs_associes')
        .select('*')
        .eq('user_id', user.id)
        .order('prenom');
      setVoyageurs(voyageursData || []);
    }
  };

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

  // ÉTAPE 9 : Fonction de génération de facture
  const genererFacture = async (reservationId, profileId, reservationData) => {
    try {
      console.log('🚀 Début génération facture');
      console.log('📋 Params:', { reservationId, profileId, assistance_pmr: reservationData.assistance_pmr });
      
      let montant_ht = 0;
      const details = {};

      // Tarif de base assistance PMR
      if (reservationData.assistance_pmr) {
        details.tarif_base = 25;
        montant_ht += 25;
      }

      // Tarif multimodal (par étape supplémentaire)
      if (reservationData.multimodal && reservationData.transports.length > 1) {
        const nb_etapes = reservationData.transports.length;
        details.nb_etapes = nb_etapes;
        details.tarif_multimodal = (nb_etapes - 1) * 15;
        montant_ht += details.tarif_multimodal;
      }

      // Assistance spéciale
      if (reservationData.assistance_pmr) {
        details.tarif_assistance_speciale = 10;
        montant_ht += 10;
      }

      // TVA 20%
      const montant_tva = montant_ht * 0.20;
      const montant_ttc = montant_ht + montant_tva;

      console.log('💰 Montants calculés:', { montant_ht, montant_tva, montant_ttc, details });

      // Générer numéro de facture (fallback sans RPC pour debug)
      const num_facture = `FACT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      console.log('🔢 Numéro facture:', num_facture);

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

      console.log('📝 Données facture à insérer:', factureData);

      // Créer la facture
      const { data: facture, error } = await supabase
        .from('factures')
        .insert(factureData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur insert facture:', error);
        throw error;
      }

      console.log('✅ Facture créée avec succès:', facture);
      return facture;
    } catch (error) {
      console.error('❌ Erreur génération facture:', error);
      alert('⚠️ Erreur lors de la génération de la facture: ' + error.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📝 Début création réservation');
      
      // Générer numéro de réservation MMT
      const num_reza_mmt = `MMT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Créer la réservation
      const { data: reservation, error: resaError } = await supabase
        .from('reservations')
        .insert({
          profile_id: profile.id,
          voyageur_associe_id: formData.voyageur_associe_id,
          num_reza_mmt,
          depart_lieu: formData.depart_lieu,
          arrivee_lieu: formData.arrivee_lieu,
          date_depart: new Date(formData.date_depart).toISOString(),
          multimodal: formData.multimodal,
          assistance_pmr: formData.assistance_pmr,
          statut: 'confirmee',
          prix_total: (Math.random() * 200 + 50).toFixed(2),
        })
        .select()
        .single();

      if (resaError) throw resaError;

      console.log('✅ Réservation créée:', reservation);

      // Créer les étapes
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

      console.log('✅ Étapes créées');

      // ÉTAPE 9 : Générer la facture si assistance PMR
      if (formData.assistance_pmr) {
        console.log('💳 Génération facture car assistance_pmr = true');
        const facture = await genererFacture(reservation.id, profile.id, formData);
        if (facture) {
          console.log('✅ Facture générée:', facture.num_facture);
        } else {
          console.warn('⚠️ Facture non générée (erreur)');
        }
      } else {
        console.log('ℹ️ Pas de facture (assistance_pmr = false)');
      }

      alert(`✅ Réservation confirmée !\n\nNuméro: ${num_reza_mmt}`);
      navigate('/mes-voyages');
    } catch (error) {
      console.error('❌ Erreur lors de la réservation:', error);
      alert('❌ Erreur lors de la réservation: ' + error.message);
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
              placeholder="Ex: Paris Gare de Lyon"
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
              placeholder="Ex: Marseille Saint-Charles"
              style={styles.input}
              required
            />
          </div>

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

          {/* ÉTAPE 8 : Sélecteur de voyageur */}
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
              <p style={styles.hint}>
                Sélectionnez la personne pour qui vous réservez ce voyage
              </p>
            </div>
          )}

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
    maxWidth: '800px',
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
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
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