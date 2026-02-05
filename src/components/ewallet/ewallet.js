import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import * as api from '../../services/api';

const CURRENCY_NAME = 'AccessCoins';
const CONVERSION_RATE = 10; // 1€ = 10 AccessCoins
const MIN_TOPUP_EUR = 10;
const TOPUP_TIERS = [10, 20, 50, 100, 200];

const BONUS_RULES = [
  { min: 100, bonusRate: 0.1 },
  { min: 50, bonusRate: 0.05 },
];

const PAYMENT_METHODS = [
  { value: 'carte_bancaire', label: 'Carte bancaire' },
  { value: 'apple_google_pay', label: 'Apple Pay / Google Pay' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
];

const getBonusRate = (amountEur) => {
  const rule = BONUS_RULES.find((r) => amountEur >= r.min);
  return rule ? rule.bonusRate : 0;
};

const getLocalKey = (userId) => `flexitrip_wallet_${userId}`;

const loadLocalWallet = (userId) => {
  try {
    const raw = localStorage.getItem(getLocalKey(userId));
    if (!raw) {
      return { balance: 0, transactions: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      balance: parsed.balance || 0,
      transactions: parsed.transactions || [],
    };
  } catch (error) {
    console.error('Erreur lecture wallet local:', error);
    return { balance: 0, transactions: [] };
  }
};

const saveLocalWallet = (userId, wallet) => {
  try {
    localStorage.setItem(getLocalKey(userId), JSON.stringify(wallet));
  } catch (error) {
    console.error('Erreur sauvegarde wallet local:', error);
  }
};

const normalizeBalance = (walletData) => {
  if (!walletData) return 0;
  return (
    walletData.balance ??
    walletData.solde ??
    walletData.coins ??
    walletData.wallet?.balance ??
    walletData.wallet?.solde ??
    0
  );
};

const normalizeTransactions = (txData) => {
  if (!txData) return [];
  if (Array.isArray(txData)) return txData;
  return txData.transactions ?? txData.data ?? [];
};

const Ewallet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [method, setMethod] = useState('especes');
  const [description, setDescription] = useState('Recharge wallet');
  const [debitAmount, setDebitAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  const computed = useMemo(() => {
    const eur = parseFloat(amountEur || 0);
    const bonusRate = getBonusRate(eur);
    const baseCoins = eur * CONVERSION_RATE;
    const bonusCoins = baseCoins * bonusRate;
    const totalCoins = baseCoins + bonusCoins;
    return {
      eur,
      bonusRate,
      baseCoins,
      bonusCoins,
      totalCoins,
    };
  }, [amountEur]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setUserId(null);
          setLoading(false);
          return;
        }
        setUserId(user.id);

        let walletData = null;
        let txData = null;
        try {
          walletData = await api.getWallet(user.id);
          txData = await api.getTransactionsByUser(user.id);
        } catch (apiError) {
          console.warn('Wallet API non disponible, fallback local:', apiError);
        }

        if (walletData || txData) {
          setBalance(normalizeBalance(walletData));
          setTransactions(normalizeTransactions(txData));
        } else {
          const local = loadLocalWallet(user.id);
          setBalance(local.balance);
          setTransactions(local.transactions);
        }
      } catch (err) {
        console.error('Erreur chargement wallet:', err);
        setError('Impossible de charger le wallet.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (location?.state?.amount) {
      setAmountEur(String(location.state.amount));
      setPrefillNotice(`Montant prérempli : ${location.state.amount}€`);
      setShowPaymentModal(true);
    }
  }, [location]);

  const persistLocalUpdate = (nextBalance, nextTransactions) => {
    if (!userId) return;
    saveLocalWallet(userId, {
      balance: nextBalance,
      transactions: nextTransactions,
    });
  };

  const processTopup = async (eurAmount) => {
    setError('');
    setSuccessMessage('');

    if (!userId) {
      setError('Veuillez vous connecter pour recharger le wallet.');
      return;
    }

    if (!eurAmount || eurAmount < MIN_TOPUP_EUR) {
      setError(`Le minimum de recharge est ${MIN_TOPUP_EUR}€.`);
      return;
    }

    const bonusRate = getBonusRate(eurAmount);
    const baseCoins = eurAmount * CONVERSION_RATE;
    const bonusCoins = baseCoins * bonusRate;
    const totalCoins = baseCoins + bonusCoins;

    setProcessing(true);
    try {
      const receiptRef = `TOPUP-${Date.now()}`;
      const tx = {
        id: `local-${Date.now()}`,
        type: 'credit',
        amount_eur: eurAmount,
        amount_coins: totalCoins,
        bonus_coins: bonusCoins,
        method,
        description,
        status: 'success',
        created_at: new Date().toISOString(),
        reference: receiptRef,
      };
      const nextBalance = balance + totalCoins;
      const nextTransactions = [tx, ...transactions];
      setBalance(nextBalance);
      setTransactions(nextTransactions);
      persistLocalUpdate(nextBalance, nextTransactions);

      const payload = {
        user_id: userId,
        amount_eur: eurAmount,
        amount_coins: totalCoins,
        base_coins: baseCoins,
        bonus_coins: bonusCoins,
        conversion_rate: CONVERSION_RATE,
        method,
        description,
        mode: 'simulation',
        reference: receiptRef,
      };

      try {
        await api.creditWallet(payload);
        const refreshed = await api.getWallet(userId);
        const refreshedTx = await api.getTransactionsByUser(userId);
        if (refreshed || refreshedTx) {
          setBalance(normalizeBalance(refreshed));
          setTransactions(normalizeTransactions(refreshedTx));
        }
      } catch (apiError) {
        console.warn('Recharge API échouée, simulation locale:', apiError);
      }

      setAmountEur('');
      setDescription('Recharge wallet');
      setPrefillNotice('');
      setLastReceipt({
        reference: receiptRef,
        coins: totalCoins,
      });
      setSuccessMessage(`✅ Recharge validée : +${totalCoins.toFixed(2)} ${CURRENCY_NAME}`);
    } catch (err) {
      console.error('Erreur recharge:', err);
      setError('Erreur lors de la recharge.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!amountEur || computed.eur < MIN_TOPUP_EUR) {
      setError(`Le minimum de recharge est ${MIN_TOPUP_EUR}€.`);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    await processTopup(computed.eur);
    setShowPaymentModal(false);
  };

  const handleDebit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Veuillez vous connecter pour payer.');
      return;
    }

    const debitCoins = parseFloat(debitAmount || 0);
    if (!debitCoins || debitCoins <= 0) {
      setError('Veuillez saisir un montant AccessCoins valide.');
      return;
    }
    if (debitCoins > balance) {
      setError('Solde insuffisant.');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        user_id: userId,
        amount_coins: debitCoins,
        description: 'Paiement service (simulation)',
        mode: 'simulation',
      };

      try {
        await api.debitWallet(payload);
        const refreshed = await api.getWallet(userId);
        const refreshedTx = await api.getTransactionsByUser(userId);
        setBalance(normalizeBalance(refreshed));
        setTransactions(normalizeTransactions(refreshedTx));
      } catch (apiError) {
        console.warn('Débit API échoué, simulation locale:', apiError);
        const tx = {
          id: `local-${Date.now()}`,
          type: 'debit',
          amount_coins: debitCoins,
          method: 'accesscoins',
          description: 'Paiement service (simulation)',
          status: 'success',
          created_at: new Date().toISOString(),
        };
        const nextBalance = balance - debitCoins;
        const nextTransactions = [tx, ...transactions];
        setBalance(nextBalance);
        setTransactions(nextTransactions);
        persistLocalUpdate(nextBalance, nextTransactions);
      }

      setDebitAmount('');
    } catch (err) {
      console.error('Erreur paiement:', err);
      setError('Erreur lors du paiement.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Chargement du wallet...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button type="button" onClick={() => navigate(-1)} style={styles.backBtn}>
            ← Retour
          </button>
          <h2 style={styles.title}>🪙 Wallet {CURRENCY_NAME}</h2>
          <p style={styles.subtitle}>Monnaie virtuelle pour vos voyages PMR</p>
        </div>
        <div style={styles.balanceCard}>
          <span style={styles.balanceLabel}>Solde</span>
          <strong style={styles.balanceValue}>{balance.toFixed(2)} {CURRENCY_NAME}</strong>
          <span style={styles.balanceHint}>1€ = {CONVERSION_RATE} {CURRENCY_NAME}</span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {successMessage && (
        <div style={styles.success}>
          <div>{successMessage}</div>
          {lastReceipt?.reference && (
            <div style={styles.receipt}>Référence : {lastReceipt.reference}</div>
          )}
        </div>
      )}
      {prefillNotice && <div style={styles.infoBox}>{prefillNotice}</div>}

      {!userId && (
        <div style={styles.infoBox}>
          <p>Connectez-vous pour activer votre wallet et réaliser des recharges.</p>
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>💳 Recharger le wallet</h3>
          <form onSubmit={handleTopup} style={styles.form}>
            <div style={styles.tiers}>
              {TOPUP_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setAmountEur(String(tier));
                    setPrefillNotice(`Montant prérempli : ${tier}€`);
                    setShowPaymentModal(true);
                  }}
                  style={styles.tierBtn}
                >
                  {tier}€
                </button>
              ))}
            </div>
            <label style={styles.label}>
              Montant en euros (min {MIN_TOPUP_EUR}€)
              <input
                type="number"
                min={MIN_TOPUP_EUR}
                step="1"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                style={styles.input}
                placeholder="Ex: 20"
              />
            </label>

            <label style={styles.label}>
              Méthode de paiement
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={styles.select}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Description
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.input}
                placeholder="Recharge AccessCoins"
              />
            </label>

            <div style={styles.summary}>
              <div>Base: {computed.baseCoins.toFixed(2)} {CURRENCY_NAME}</div>
              <div>Bonus: {computed.bonusCoins.toFixed(2)} {CURRENCY_NAME}</div>
              <strong>Total: {computed.totalCoins.toFixed(2)} {CURRENCY_NAME}</strong>
              {computed.bonusRate > 0 && (
                <span style={styles.bonusTag}>Bonus {Math.round(computed.bonusRate * 100)}%</span>
              )}
            </div>

            <button type="submit" style={styles.primaryBtn} disabled={processing}>
              {processing ? 'Traitement...' : 'Valider le paiement'}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🎟️ Payer avec {CURRENCY_NAME}</h3>
          <form onSubmit={handleDebit} style={styles.form}>
            <label style={styles.label}>
              Montant en {CURRENCY_NAME}
              <input
                type="number"
                min="1"
                step="1"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                style={styles.input}
                placeholder={`Ex: ${CONVERSION_RATE * 5}`}
              />
            </label>
            <div style={styles.infoBox}>
              <p>Paiement simulé pour tester le débit de votre wallet.</p>
            </div>
            <button type="submit" style={styles.secondaryBtn} disabled={processing}>
              {processing ? 'Traitement...' : `Payer en ${CURRENCY_NAME}`}
            </button>
          </form>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📜 Historique des transactions</h3>
        {transactions.length === 0 ? (
          <div style={styles.empty}>Aucune transaction pour le moment.</div>
        ) : (
          <div style={styles.table}>
            {transactions.map((tx) => (
              <div key={tx.id || tx.reference_transaction} style={styles.row}>
                <div>
                  <strong>{tx.type === 'debit' ? 'Paiement' : 'Recharge'}</strong>
                  <div style={styles.rowMeta}>{tx.description || 'Transaction wallet'}</div>
                </div>
                <div style={styles.rowAmount}>
                  {tx.type === 'debit' ? '-' : '+'}
                  {Number(tx.amount_coins ?? tx.amount ?? 0).toFixed(2)} {CURRENCY_NAME}
                </div>
                <div style={styles.rowDate}>
                  {new Date(tx.created_at || Date.now()).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>💳 Paiement de recharge</h3>
            <p style={styles.modalSubtitle}>
              Montant : <strong>{computed.eur.toFixed(2)} €</strong> → {computed.totalCoins.toFixed(2)} {CURRENCY_NAME}
            </p>

            {method === 'carte_bancaire' && (
              <div style={styles.modalForm}>
                <label style={styles.label}>Numéro de carte</label>
                <input
                  type="text"
                  value={cardData.number}
                  onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  style={styles.input}
                />
                <label style={styles.label}>Nom sur la carte</label>
                <input
                  type="text"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  placeholder="JEAN DUPONT"
                  style={styles.input}
                />
                <div style={styles.cardRow}>
                  <div style={styles.cardCol}>
                    <label style={styles.label}>Expiration</label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      placeholder="MM/AA"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.cardCol}>
                    <label style={styles.label}>CVV</label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      placeholder="123"
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            )}

            {method !== 'carte_bancaire' && (
              <div style={styles.infoBox}>
                <p>Recharge simulée via {PAYMENT_METHODS.find((m) => m.value === method)?.label}.</p>
              </div>
            )}

            <div style={styles.modalActions}>
              <button onClick={handleConfirmPayment} style={styles.confirmBtn} disabled={processing}>
                {processing ? 'Traitement...' : 'Confirmer la recharge'}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={styles.cancelModalBtn}
                type="button"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backBtn: {
    marginBottom: '10px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '999px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  title: {
    margin: 0,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#666',
  },
  balanceCard: {
    background: '#0f172a',
    color: '#fff',
    padding: '16px 20px',
    borderRadius: '12px',
    minWidth: '220px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  balanceLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.7,
  },
  balanceValue: {
    fontSize: '22px',
  },
  balanceHint: {
    fontSize: '12px',
    opacity: 0.7,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  label: {
    fontSize: '14px',
    color: '#333',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  summary: {
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
  },
  tiers: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tierBtn: {
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '999px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  bonusTag: {
    alignSelf: 'flex-start',
    background: '#dcfce7',
    color: '#166534',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontWeight: 'bold',
  },
  receipt: {
    marginTop: '6px',
    fontSize: '12px',
    fontWeight: 'normal',
  },
  infoBox: {
    background: '#eff6ff',
    color: '#1e3a8a',
    padding: '12px',
    borderRadius: '8px',
  },
  empty: {
    color: '#666',
    fontStyle: 'italic',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr',
    gap: '16px',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '10px',
    background: '#f8fafc',
  },
  rowMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  rowAmount: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  rowDate: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
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
    padding: '24px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
  },
  modalForm: {
    marginTop: '16px',
  },
  modalActions: {
    marginTop: '20px',
    display: 'flex',
    gap: '10px',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelModalBtn: {
    flex: 1,
    padding: '12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cardRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '12px',
  },
  cardCol: {
    flex: 1,
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
  },
};

export default Ewallet;