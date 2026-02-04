import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const AgentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [qr, setQr] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = { Authorization: `Bearer ${token}` };

        const [qrRes, assignmentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/auth/me/qr`, { headers }),
          axios.get(`${API_BASE_URL}/auth/me/assignments`, { headers })
        ]);

        setQr(qrRes.data?.agent_qr_public_id || null);
        setAssignments(assignmentsRes.data?.assignments || []);
      } catch (e) {
        console.error('Erreur dashboard agent:', e);
        setError(e.response?.data?.error || 'Erreur lors du chargement du dashboard Agent');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    } else {
      setLoading(false);
      setError('Token manquant');
    }
  }, [token]);

  const copyQr = async () => {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr);
      alert('QR copié dans le presse-papiers');
    } catch {
      alert('Impossible de copier automatiquement. Sélectionnez le texte et copiez-le.');
    }
  };

  const openChat = (reservationId, etapeNumero) => {
    if (!reservationId || !etapeNumero) return;
    navigate(`/chat/reservation/${reservationId}/etape/${etapeNumero}`);
  };

  const getReservationIdFromAssignment = (a) => a?.reservation_id || a?.reservation?.reservation_id;

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Dashboard Agent</h2>
        <p>Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Dashboard Agent</h2>
        <p style={{ color: 'crimson' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h2>Dashboard Agent PMR</h2>
      <p>
        Connecté en tant que <strong>{user?.surname} {user?.name}</strong>
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>Mon QR Agent</h3>
        <p style={{ marginTop: 8 }}>
          Le PMR doit saisir ce code lors de la validation d’une étape.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ padding: '8px 10px', background: '#f6f6f6', borderRadius: 6 }}>
            {qr || '—'}
          </code>
          <button onClick={copyQr} disabled={!qr}>
            Copier
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>Mes étapes validées</h3>
        {assignments.length === 0 ? (
          <p>Aucune étape assignée pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {assignments.map((a) => (
              <div key={a.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>Étape #{a.etape_numero}</strong> — <span>{a.status}</span>
                    {a.location ? <span> — {a.location}</span> : null}
                  </div>
                  <div style={{ color: '#555' }}>
                    {a.validated_at ? new Date(a.validated_at).toLocaleString('fr-FR') : null}
                  </div>
                </div>

                {(() => {
                  const reservationId = getReservationIdFromAssignment(a);
                  const canOpen = Boolean(reservationId && a.etape_numero);
                  return (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={() => openChat(reservationId, a.etape_numero)}
                        disabled={!canOpen}
                        title={!canOpen ? 'ReservationId introuvable dans l’assignation' : ''}
                      >
                        💬 Ouvrir le chat
                      </button>
                    </div>
                  );
                })()}

                {a.segment ? (
                  <div style={{ marginTop: 8 }}>
                    <div><strong>Transport:</strong> {a.segment.mode} {a.segment.line ? `(${a.segment.line})` : ''}</div>
                    <div><strong>De:</strong> {a.segment.departure_station || '—'} <strong>à</strong> {a.segment.arrival_station || '—'}</div>
                    <div><strong>Opérateur:</strong> {a.segment.operator || '—'}</div>
                  </div>
                ) : null}

                {a.pmr ? (
                  <div style={{ marginTop: 8 }}>
                    <div><strong>PMR:</strong> {a.pmr.surname} {a.pmr.name}</div>
                    {a.pmr.phone ? <div><strong>Téléphone:</strong> {a.pmr.phone}</div> : null}
                    {a.pmr.type_handicap ? <div><strong>Handicap:</strong> {a.pmr.type_handicap}</div> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
