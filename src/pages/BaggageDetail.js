import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const eventLabel = (eventType) => {
  switch (eventType) {
    case 'TAG_PRINTED':
      return 'Tag généré';
    case 'DROP_OFF':
      return 'Déposé';
    case 'TRANSFER':
      return 'Transfert';
    case 'LOAD':
      return 'Chargé';
    case 'UNLOAD':
      return 'Déchargé';
    case 'ARRIVAL':
      return 'Arrivée';
    case 'DELIVERY':
      return 'Remise au client';
    case 'EXCEPTION':
      return 'Incident';
    default:
      return eventType || '—';
  }
};

const BaggageDetail = () => {
  const { bagageId } = useParams();
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE_URL}/bagages/${bagageId}/timeline`, { headers });
        setData(res.data);
      } catch (e) {
        console.error('Erreur timeline bagage:', e);
        setError(e.response?.data?.error || 'Erreur lors du chargement du détail');
      } finally {
        setLoading(false);
      }
    };

    if (!token) {
      setLoading(false);
      setError('Token manquant');
      return;
    }

    if (!bagageId) {
      setLoading(false);
      setError('bagageId manquant');
      return;
    }

    run();
  }, [bagageId, headers, token]);

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <h2>🧳 Détail bagage</h2>
        <p>Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <h2>🧳 Détail bagage</h2>
        <p style={{ color: 'crimson' }}>{error}</p>
        <button onClick={() => navigate('/user/bagages')}>← Retour</button>
      </div>
    );
  }

  const bagage = data?.bagage;
  const events = data?.events || [];

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h2>🧳 Détail bagage #{bagage?.bagage_id}</h2>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <QRCodeSVG value={bagage?.bagage_public_id || ''} size={130} />
          <div>
            <div>
              <strong>Code:</strong> <code>{bagage?.bagage_public_id}</code>
            </div>
            <div>
              <strong>Reservation:</strong> {bagage?.reservation_id}
            </div>
            <div>
              <strong>Type:</strong> {bagage?.bagage_type}
            </div>
            {bagage?.last_location ? (
              <div>
                <strong>Dernière position:</strong> {bagage?.last_location}
              </div>
            ) : null}
            {bagage?.last_event_at ? (
              <div>
                <strong>Dernier scan:</strong> {new Date(bagage.last_event_at).toLocaleString('fr-FR')}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>Timeline</h3>
        {events.length === 0 ? (
          <p>Aucun événement.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {events.map((ev) => (
              <div key={ev.event_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{eventLabel(ev.event_type)}</strong>
                    {ev.location ? <span> — {ev.location}</span> : null}
                  </div>
                  <div style={{ color: '#555' }}>
                    {ev.scanned_at ? new Date(ev.scanned_at).toLocaleString('fr-FR') : ''}
                  </div>
                </div>
                <div style={{ marginTop: 6, color: '#444' }}>
                  {ev.actor_type ? <span><strong>Acteur:</strong> {ev.actor_type}</span> : null}
                  {ev.actor_display_name ? <span> — {ev.actor_display_name}</span> : null}
                </div>
                {ev.note ? <div style={{ marginTop: 6 }}>{ev.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/user/bagages')}>← Retour</button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(bagage?.bagage_public_id || '');
              alert('Code bagage copié');
            } catch {
              alert('Copie impossible.');
            }
          }}
        >
          Copier code
        </button>
      </div>
    </div>
  );
};

export default BaggageDetail;
