import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function Facturation() {
  const [profile, setProfile] = useState(null);
  const [factures, setFactures] = useState([]);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    moyen_paiement: 'carte_bancaire',
    numero_carte: '',
    nom_carte: '',
    expiration: '',
    cvv: '',
  });
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadFactures();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setProfile(data);
  };

  const loadFactures = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const { data } = await supabase
        .from('factures')
        .select(`
          *,
          reservations(
            num_reza_mmt,
            depart_lieu,
            arrivee_lieu,
            date_depart
          ),
          paiements(*)
        `)
        .eq('profile_id', profileData.id)
        .order('created_at', { ascending: false });

      setFactures(data || []);
    }
    setLoading(false);
  };

  const handlePaymentChange = (e) => {
    setPaymentData({ ...paymentData, [e.target.name]: e.target.value });
  };

  const handlePayNow = (facture) => {
    setSelectedFacture(facture);
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // SIMULATION de paiement (2 secondes)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Générer référence transaction
      const ref_transaction = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Créer le paiement
      const { error: paiementError } = await supabase
        .from('paiements')
        .insert({
          facture_id: selectedFacture.id,
          profile_id: profile.id,
          montant: selectedFacture.montant_ttc,
          moyen_paiement: paymentData.moyen_paiement,
          statut: 'valide',
          reference_transaction: ref_transaction,
          metadata: {
            numero_carte_masque: paymentData.numero_carte ? `****${paymentData.numero_carte.slice(-4)}` : null,
            nom_carte: paymentData.nom_carte,
          },
        });

      if (paiementError) throw paiementError;

      // Mettre à jour le statut de la facture
      await supabase
        .from('factures')
        .update({ statut: 'payee' })
        .eq('id', selectedFacture.id);

      alert(`✅ Paiement validé !\nRéférence : ${ref_transaction}`);
      
      // Reset
      setPaymentData({
        moyen_paiement: 'carte_bancaire',
        numero_carte: '',
        nom_carte: '',
        expiration: '',
        cvv: '',
      });
      setShowPaymentForm(false);
      setSelectedFacture(null);
      await loadFactures();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadFacture = (facture) => {
    alert(`📄 Téléchargement de la facture ${facture.num_facture}\n\n(Simulation - Dans une vraie app, cela générerait un PDF)`);
  };

  const getStatutBadge = (statut) => {
    const styles_statut = {
      en_attente: { bg: '#fff3cd', color: '#856404', text: '⏳ En attente' },
      payee: { bg: '#d4edda', color: '#155724', text: '✅ Payée' },
      annulee: { bg: '#f8d7da', color: '#721c24', text: '❌ Annulée' },
    };
    
    const style = styles_statut[statut] || styles_statut.en_attente;
    
    return (
      <span style={{
        padding: '6px 12px',
        background: style.bg,
        color: style.color,
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
      }}>
        {style.text}
      </span>
    );
  };

  const getMoyenPaiementIcon = (moyen) => {
    const icons = {
      carte_bancaire: '💳',
      virement: '🏦',
      especes: '💵',
      cheque: '📝',
    };
    return icons[moyen] || '💰';
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>💰 Mes factures et paiements</h2>
        <p style={styles.subtitle}>Gérez vos factures d'assistance PMR</p>
      </div>

      {factures.length === 0 && (
        <div style={styles.empty}>
          <p>Aucune facture pour le moment</p>
        </div>
      )}

      <div style={styles.facturesList}>
        {factures.map(facture => (
          <div key={facture.id} style={styles.factureCard}>
            <div style={styles.factureHeader}>
              <div>
                <h4 style={styles.numFacture}>{facture.num_facture}</h4>
                <p style={styles.reservation}>
                  Réservation : {facture.reservations?.num_reza_mmt}
                </p>
                <p style={styles.trajet}>
                  {facture.reservations?.depart_lieu} → {facture.reservations?.arrivee_lieu}
                </p>
              </div>
              {getStatutBadge(facture.statut)}
            </div>

            <div style={styles.factureBody}>
              <div style={styles.montantSection}>
                <div style={styles.montantRow}>
                  <span>Montant HT :</span>
                  <strong>{facture.montant_ht?.toFixed(2)} €</strong>
                </div>
                <div style={styles.montantRow}>
                  <span>TVA (20%) :</span>
                  <strong>{facture.montant_tva?.toFixed(2)} €</strong>
                </div>
                <div style={{...styles.montantRow, ...styles.montantTotal}}>
                  <span>Montant TTC :</span>
                  <strong>{facture.montant_ttc?.toFixed(2)} €</strong>
                </div>
              </div>

              {facture.details && Object.keys(facture.details).length > 0 && (
                <div style={styles.detailsSection}>
                  <strong>Détail :</strong>
                  <ul style={styles.detailsList}>
                    {facture.details.tarif_base && (
                      <li>Assistance PMR de base : {facture.details.tarif_base} €</li>
                    )}
                    {facture.details.tarif_multimodal && (
                      <li>Assistance multimodale ({facture.details.nb_etapes} étapes) : {facture.details.tarif_multimodal} €</li>
                    )}
                    {facture.details.tarif_assistance_speciale && (
                      <li>Assistance spéciale : {facture.details.tarif_assistance_speciale} €</li>
                    )}
                    {facture.details.tarif_bagage && (
                      <li>Bagages accompagnés ({facture.details.nb_bagages}) : {facture.details.tarif_bagage} €</li>
                    )}
                  </ul>
                </div>
              )}

              {facture.paiements && facture.paiements.length > 0 && (
                <div style={styles.paiementInfo}>
                  <strong>💳 Paiement effectué :</strong>
                  <p>
                    {getMoyenPaiementIcon(facture.paiements[0].moyen_paiement)}
                    {' '}
                    {facture.paiements[0].moyen_paiement.replace('_', ' ')}
                  </p>
                  <p style={styles.refTransaction}>
                    Réf : {facture.paiements[0].reference_transaction}
                  </p>
                  <p style={styles.datePaiement}>
                    Le {new Date(facture.paiements[0].date_paiement).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>

            <div style={styles.factureActions}>
              {facture.statut === 'en_attente' && (
                <button
                  onClick={() => handlePayNow(facture)}
                  style={styles.payBtn}
                >
                  💳 Payer maintenant
                </button>
              )}
              <button
                onClick={() => handleDownloadFacture(facture)}
                style={styles.downloadBtn}
              >
                📄 Télécharger PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de paiement */}
      {showPaymentForm && selectedFacture && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>💳 Paiement sécurisé</h3>
            <p style={styles.modalSubtitle}>
              Facture : {selectedFacture.num_facture}
            </p>
            <div style={styles.modalMontant}>
              Montant à payer : <strong>{selectedFacture.montant_ttc.toFixed(2)} €</strong>
            </div>

            <form onSubmit={handleSubmitPayment} style={styles.paymentForm}>
              <label style={styles.label}>Moyen de paiement</label>
              <select
                name="moyen_paiement"
                value={paymentData.moyen_paiement}
                onChange={handlePaymentChange}
                style={styles.input}
              >
                <option value="carte_bancaire">💳 Carte bancaire</option>
                <option value="virement">🏦 Virement bancaire</option>
                <option value="especes">💵 Espèces</option>
                <option value="cheque">📝 Chèque</option>
              </select>

              {paymentData.moyen_paiement === 'carte_bancaire' && (
                <>
                  <label style={styles.label}>Numéro de carte</label>
                  <input
                    type="text"
                    name="numero_carte"
                    placeholder="1234 5678 9012 3456"
                    value={paymentData.numero_carte}
                    onChange={handlePaymentChange}
                    maxLength="16"
                    required
                    style={styles.input}
                  />

                  <label style={styles.label}>Nom sur la carte</label>
                  <input
                    type="text"
                    name="nom_carte"
                    placeholder="JEAN DUPONT"
                    value={paymentData.nom_carte}
                    onChange={handlePaymentChange}
                    required
                    style={styles.input}
                  />

                  <div style={styles.cardRow}>
                    <div style={styles.cardCol}>
                      <label style={styles.label}>Expiration</label>
                      <input
                        type="text"
                        name="expiration"
                        placeholder="MM/AA"
                        value={paymentData.expiration}
                        onChange={handlePaymentChange}
                        maxLength="5"
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.cardCol}>
                      <label style={styles.label}>CVV</label>
                      <input
                        type="text"
                        name="cvv"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={handlePaymentChange}
                        maxLength="3"
                        required
                        style={styles.input}
                      />
                    </div>
                  </div>
                </>
              )}

              {paymentData.moyen_paiement === 'virement' && (
                <div style={styles.virementInfo}>
                  <p><strong>Coordonnées bancaires :</strong></p>
                  <p>IBAN : FR76 1234 5678 9012 3456 7890 123</p>
                  <p>BIC : BNPAFRPPXXX</p>
                  <p>Référence : {selectedFacture.num_facture}</p>
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="submit"
                  disabled={processing}
                  style={styles.confirmBtn}
                >
                  {processing ? '⏳ Paiement en cours...' : `✅ Payer ${selectedFacture.montant_ttc.toFixed(2)} €`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedFacture(null);
                  }}
                  style={styles.cancelModalBtn}
                >
                  ❌ Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: '40px 20px',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 40px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '10px',
  },
  empty: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    color: '#666',
  },
  facturesList: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },
  factureCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  factureHeader: {
    padding: '20px',
    background: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #e9ecef',
  },
  numFacture: {
    margin: 0,
    color: '#667eea',
    fontSize: '18px',
  },
  reservation: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  trajet: {
    fontSize: '13px',
    color: '#999',
    marginTop: '3px',
  },
  factureBody: {
    padding: '20px',
  },
  montantSection: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  montantRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  montantTotal: {
    borderTop: '2px solid #ddd',
    marginTop: '8px',
    paddingTop: '12px',
    fontSize: '16px',
    color: '#667eea',
  },
  detailsSection: {
    fontSize: '14px',
    marginBottom: '15px',
  },
  detailsList: {
    marginTop: '8px',
    paddingLeft: '20px',
    color: '#666',
  },
  paiementInfo: {
    background: '#d4edda',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  refTransaction: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  },
  datePaiement: {
    fontSize: '12px',
    color: '#999',
    marginTop: '3px',
  },
  factureActions: {
    padding: '15px 20px',
    background: '#f8f9fa',
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid #e9ecef',
  },
  payBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  downloadBtn: {
    flex: 1,
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  modalMontant: {
    padding: '15px',
    background: '#e3f2fd',
    borderRadius: '8px',
    fontSize: '18px',
    textAlign: 'center',
    margin: '20px 0',
  },
  paymentForm: {
    marginTop: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginTop: '15px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  cardRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '15px',
  },
  cardCol: {
    flex: 1,
  },
  virementInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '15px',
  },
  modalActions: {
    marginTop: '25px',
    display: 'flex',
    gap: '10px',
  },
  confirmBtn: {
    flex: 1,
    padding: '15px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
  },
  cancelModalBtn: {
    flex: 1,
    padding: '15px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
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
};

export default Facturation;
