import React, { useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const BaggageScan = () => {
  const token = useMemo(() => localStorage.getItem('token'), []);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [form, setForm] = useState({
    bagage_public_id: '',
    event_type: 'DROP_OFF',
    location: '',
    note: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      if (!form.bagage_public_id.trim()) {
        setError('Le code bagage est requis');
        return;
      }

      const payload = {
        bagage_public_id: form.bagage_public_id.trim(),
        event_type: form.event_type,
        location: form.location.trim() || null,
        note: form.note.trim() || null
      };

      const res = await axios.post(`${API_BASE_URL}/bagages/scan`, payload, { headers });
      setResult(res.data);
    } catch (e2) {
      console.error('Erreur scan bagage:', e2);
      setError(e2.response?.data?.error || 'Erreur lors du scan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h2>📦 Scan bagage (Agent)</h2>
      <p style={{ color: '#555' }}>
        Saisis le code (contenu du QR) puis enregistre un événement de tracking.
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <div>
            <label>Code bagage (QR)</label>
            <input
              value={form.bagage_public_id}
              onChange={(e) => setForm((p) => ({ ...p, bagage_public_id: e.target.value }))}
              placeholder="ex: 9f1c..."
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label>Type d’événement</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
                style={{ width: '100%', padding: 8 }}
              >
                <option value="DROP_OFF">Déposé</option>
                <option value="TRANSFER">Transfert</option>
                <option value="LOAD">Chargé</option>
                <option value="UNLOAD">Déchargé</option>
                <option value="ARRIVAL">Arrivée</option>
                <option value="DELIVERY">Remise</option>
                <option value="EXCEPTION">Incident</option>
              </select>
            </div>

            <div>
              <label>Localisation</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="ex: CDG T2, quai 4…"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </div>

          <div>
            <label>Note (optionnel)</label>
            <input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="ex: bagage fragile, retard…"
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Valider scan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ bagage_public_id: '', event_type: 'DROP_OFF', location: '', note: '' });
                setResult(null);
                setError(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {error ? <p style={{ marginTop: 12, color: 'crimson' }}>{error}</p> : null}

        {result?.event ? (
          <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <strong>OK:</strong> événement #{result.event.event_id} enregistré
            {result.bagage ? (
              <div style={{ marginTop: 6, color: '#444' }}>
                Bagage #{result.bagage.bagage_id} — statut: {result.bagage.status}
                {result.bagage.last_location ? ` — ${result.bagage.last_location}` : ''}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!token ? (
        <p style={{ marginTop: 12, color: 'crimson' }}>Token manquant (connecte-toi en Agent).</p>
      ) : null}
    </div>
  );
};

export default BaggageScan;
