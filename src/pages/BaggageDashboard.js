import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const statusLabel = (status) => {
  switch (status) {
    case 'created':
      return 'Créé';
    case 'tagged':
      return 'Tag généré';
    case 'dropped':
      return 'Déposé';
    case 'in_transit':
      return 'En transit';
    case 'loaded':
      return 'Chargé';
    case 'arrived':
      return 'Arrivé';
    case 'delivered':
      return 'Livré';
    case 'exception':
      return 'Incident';
    case 'non_localise':
      return 'Non localisé';
    default:
      return status || '—';
  }
};

const BaggageDashboard = () => {
  const { user } = useContext(AuthContext);
  const token = useMemo(() => localStorage.getItem('token'), []);
  const navigate = useNavigate();

  const [bagages, setBagages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: 'all',
    reservationId: ''
  });

  const [createForm, setCreateForm] = useState({
    reservation_id: '',
    bagage_type: 'soute',
    poids_kg: '',
    fragile: false,
    assistance_required: false
  });
  const [creating, setCreating] = useState(false);

  const [aiForm, setAiForm] = useState({
    reservation_id: '',
    poids_kg: '',
    bagage_type: 'soute',
    couleur: '',
    description: '',
    photoFile: null
  });
  const [aiPreview, setAiPreview] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRegistering, setAiRegistering] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const [searchForm, setSearchForm] = useState({
    tracking_id: '',
    couleur: '',
    nom_passager: '',
    photoFile: null
  });
  const [searchPreview, setSearchPreview] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const buildFormData = (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      formData.append(key, value);
    });
    return formData;
  };

  const onAnalyzeBagage = async (e) => {
    e.preventDefault();
    if (!aiForm.photoFile) {
      setError('Photo bagage requise pour l’analyse IA');
      return;
    }

    try {
      setAiAnalyzing(true);
      setError(null);

      const formData = buildFormData({
        photo: aiForm.photoFile,
        couleur: aiForm.couleur,
        bagage_type: aiForm.bagage_type,
        description: aiForm.description
      });

      const res = await axios.post(`${API_BASE_URL}/bagages/analyze`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setAiAnalysis(res.data || null);
    } catch (e2) {
      console.error('Erreur analyse IA:', e2);
      setError(e2.response?.data?.error || 'Erreur lors de l’analyse IA');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const onRegisterBagageAI = async () => {
    if (!aiAnalysis?.tracking_id) {
      setError('Analyse IA incomplète');
      return;
    }

    const reservationId = Number(aiForm.reservation_id);
    if (!reservationId) {
      setError('reservation_id est requis');
      return;
    }

    try {
      setAiRegistering(true);
      setError(null);

      const payload = {
        reservation_id: reservationId,
        passenger_id: user?.id || user?.user_id || null,
        poids_kg: aiForm.poids_kg ? Number(aiForm.poids_kg) : null,
        bagage_type: aiForm.bagage_type,
        couleur: aiForm.couleur,
        description: aiForm.description,
        tracking_id: aiAnalysis.tracking_id,
        features_vector: aiAnalysis.features_vector,
        photo_url: aiAnalysis.photo_url,
        assistance_required: Boolean(user?.assistance_pmr || user?.pmr_flag)
      };

      const res = await axios.post(`${API_BASE_URL}/bagages/register`, payload, { headers });
      const created = res.data?.bagage;
      if (created) {
        setBagages((prev) => [created, ...prev]);
      }

      setAiForm({
        reservation_id: '',
        poids_kg: '',
        bagage_type: 'soute',
        couleur: '',
        description: '',
        photoFile: null
      });
      setAiPreview('');
      setAiAnalysis(null);
    } catch (e2) {
      console.error('Erreur enregistrement IA:', e2);
      setError(e2.response?.data?.error || 'Erreur lors de l’enregistrement du bagage');
    } finally {
      setAiRegistering(false);
    }
  };

  const onSearchBagage = async (e) => {
    e.preventDefault();
    try {
      setSearching(true);
      setError(null);

      const formData = buildFormData({
        photo: searchForm.photoFile,
        tracking_id: searchForm.tracking_id,
        couleur: searchForm.couleur,
        nom_passager: searchForm.nom_passager
      });

      const res = await axios.post(`${API_BASE_URL}/bagages/search`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSearchResults(res.data?.results || []);
    } catch (e2) {
      console.error('Erreur recherche bagage:', e2);
      setError(e2.response?.data?.error || 'Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const fetchBagages = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/bagages`, { headers });
      setBagages(res.data?.bagages || []);
    } catch (e) {
      console.error('Erreur chargement bagages:', e);
      setError(e.response?.data?.error || 'Erreur lors du chargement des bagages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Token manquant');
      return;
    }
    fetchBagages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      if (aiPreview) URL.revokeObjectURL(aiPreview);
      if (searchPreview) URL.revokeObjectURL(searchPreview);
    };
  }, [aiPreview, searchPreview]);

  const filtered = bagages.filter((b) => {
    if (filters.status !== 'all' && b.status !== filters.status) return false;
    if (filters.reservationId.trim()) {
      return String(b.reservation_id) === filters.reservationId.trim();
    }
    return true;
  });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);

      const reservationId = Number(createForm.reservation_id);
      if (!reservationId) {
        setError('reservation_id est requis');
        return;
      }

      const payload = {
        reservation_id: reservationId,
        bagage_type: createForm.bagage_type,
        poids_kg: createForm.poids_kg ? Number(createForm.poids_kg) : null,
        fragile: Boolean(createForm.fragile),
        assistance_required: Boolean(createForm.assistance_required)
      };

      const res = await axios.post(`${API_BASE_URL}/bagages`, payload, { headers });
      const created = res.data?.bagage;
      if (created) {
        setBagages((prev) => [created, ...prev]);
        setCreateForm({
          reservation_id: '',
          bagage_type: 'soute',
          poids_kg: '',
          fragile: false,
          assistance_required: false
        });
      }
    } catch (e2) {
      console.error('Erreur création bagage:', e2);
      setError(e2.response?.data?.error || 'Erreur lors de la création du bagage');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h2>🧳 Mes bagages</h2>
        <p>Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h2>🧳 Mes bagages</h2>
        <p style={{ color: 'crimson' }}>{error}</p>
        <button onClick={fetchBagages}>Réessayer</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2>🧳 Mes bagages</h2>
      <p>
        Connecté en tant que <strong>{user?.surname} {user?.name}</strong>
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>Ajouter un bagage</h3>
        <p style={{ marginTop: 6, color: '#555' }}>
          MVP: tu saisis l’ID de réservation, puis l’app génère un QR pour ce bagage.
        </p>
        <form onSubmit={onCreate} style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
          <div>
            <label>Reservation ID</label>
            <input
              type="number"
              value={createForm.reservation_id}
              onChange={(e) => setCreateForm((p) => ({ ...p, reservation_id: e.target.value }))}
              placeholder="ex: 12"
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <div>
            <label>Type</label>
            <select
              value={createForm.bagage_type}
              onChange={(e) => setCreateForm((p) => ({ ...p, bagage_type: e.target.value }))}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="soute">Soute</option>
              <option value="cabine">Cabine</option>
              <option value="medical">Médical</option>
              <option value="fauteuil">Fauteuil</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label>Poids (kg)</label>
            <input
              type="number"
              step="0.1"
              value={createForm.poids_kg}
              onChange={(e) => setCreateForm((p) => ({ ...p, poids_kg: e.target.value }))}
              placeholder="ex: 18.5"
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={createForm.fragile}
                onChange={(e) => setCreateForm((p) => ({ ...p, fragile: e.target.checked }))}
              />
              Fragile
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={createForm.assistance_required}
                onChange={(e) => setCreateForm((p) => ({ ...p, assistance_required: e.target.checked }))}
              />
              Assistance
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating}>
              {creating ? 'Création…' : 'Créer bagage + QR'}
            </button>
            <button type="button" onClick={fetchBagages}>
              Actualiser
            </button>
          </div>
        </form>
      </div>

      <div style={{ border: '1px solid #dbeafe', borderRadius: 8, padding: 16, marginTop: 16, background: '#f8fbff' }}>
        <h3>🧠 Identification bagage (IA) — après pesée</h3>
        <p style={{ marginTop: 6, color: '#555' }}>
          Ajoute une photo + caractéristiques pour générer un tracking ID et enrichir le suivi.
        </p>
        <form onSubmit={onAnalyzeBagage} style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
          <div>
            <label>Reservation ID</label>
            <input
              type="number"
              value={aiForm.reservation_id}
              onChange={(e) => setAiForm((p) => ({ ...p, reservation_id: e.target.value }))}
              placeholder="ex: 12"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label>Poids (kg)</label>
            <input
              type="number"
              step="0.1"
              value={aiForm.poids_kg}
              onChange={(e) => setAiForm((p) => ({ ...p, poids_kg: e.target.value }))}
              placeholder="ex: 23"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label>Type</label>
            <select
              value={aiForm.bagage_type}
              onChange={(e) => setAiForm((p) => ({ ...p, bagage_type: e.target.value }))}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="soute">Soute</option>
              <option value="cabine">Cabine</option>
              <option value="medical">Médical</option>
              <option value="fauteuil">Fauteuil</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label>Couleur</label>
            <input
              value={aiForm.couleur}
              onChange={(e) => setAiForm((p) => ({ ...p, couleur: e.target.value }))}
              placeholder="ex: noir, rouge"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <input
              value={aiForm.description}
              onChange={(e) => setAiForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="ex: valise rigide avec autocollants"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Photo bagage</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAiForm((p) => ({ ...p, photoFile: file }));
                setAiPreview(file ? URL.createObjectURL(file) : '');
              }}
            />
          </div>
          {aiPreview ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <img src={aiPreview} alt="Aperçu bagage" style={{ maxWidth: 260, borderRadius: 8, border: '1px solid #ddd' }} />
            </div>
          ) : null}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button type="submit" disabled={aiAnalyzing}>
              {aiAnalyzing ? 'Analyse IA…' : 'Analyser le bagage'}
            </button>
            {aiAnalysis?.tracking_id ? (
              <button type="button" onClick={onRegisterBagageAI} disabled={aiRegistering}>
                {aiRegistering ? 'Enregistrement…' : 'Associer au passager'}
              </button>
            ) : null}
          </div>
        </form>

        {aiAnalysis?.tracking_id ? (
          <div style={{ marginTop: 12, padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <strong>Tracking ID:</strong> {aiAnalysis.tracking_id}
            {aiAnalysis.photo_url ? (
              <div style={{ marginTop: 8 }}>
                <img src={aiAnalysis.photo_url} alt="Bagage analysé" style={{ maxWidth: 260, borderRadius: 8 }} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>🔍 Recherche bagage perdu (IA)</h3>
        <form onSubmit={onSearchBagage} style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
          <div>
            <label>Tracking ID</label>
            <input
              value={searchForm.tracking_id}
              onChange={(e) => setSearchForm((p) => ({ ...p, tracking_id: e.target.value }))}
              placeholder="ex: BAG-XXXX"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label>Couleur</label>
            <input
              value={searchForm.couleur}
              onChange={(e) => setSearchForm((p) => ({ ...p, couleur: e.target.value }))}
              placeholder="ex: noir"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label>Nom passager</label>
            <input
              value={searchForm.nom_passager}
              onChange={(e) => setSearchForm((p) => ({ ...p, nom_passager: e.target.value }))}
              placeholder="ex: Dupont"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label>Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSearchForm((p) => ({ ...p, photoFile: file }));
                setSearchPreview(file ? URL.createObjectURL(file) : '');
              }}
            />
          </div>
          {searchPreview ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <img src={searchPreview} alt="Aperçu recherche" style={{ maxWidth: 260, borderRadius: 8, border: '1px solid #ddd' }} />
            </div>
          ) : null}
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={searching}>
              {searching ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
        </form>

        {searchResults.length > 0 ? (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {searchResults.map((r) => (
              <div key={r.bagage_id || r.tracking_id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{r.tracking_id || r.bagage_public_id || 'Bagage'}</strong>
                    {typeof r.score === 'number' ? (
                      <span style={{ marginLeft: 8, color: '#555' }}>Score: {(r.score * 100).toFixed(1)}%</span>
                    ) : null}
                  </div>
                  <div style={{ color: '#555' }}>{r.statut ? statusLabel(r.statut) : ''}</div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="Bagage" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  ) : null}
                  <div>
                    {r.nom_passager ? <div><strong>Passager:</strong> {r.nom_passager}</div> : null}
                    {r.couleur ? <div><strong>Couleur:</strong> {r.couleur}</div> : null}
                    {r.bagage_type ? <div><strong>Type:</strong> {r.bagage_type}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label>Filtre statut</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            style={{ marginLeft: 8, padding: 6 }}
          >
            <option value="all">Tous</option>
            <option value="tagged">Tag généré</option>
            <option value="dropped">Déposé</option>
            <option value="in_transit">En transit</option>
            <option value="loaded">Chargé</option>
            <option value="arrived">Arrivé</option>
            <option value="delivered">Livré</option>
            <option value="exception">Incident</option>
          </select>
        </div>
        <div>
          <label>Reservation ID</label>
          <input
            value={filters.reservationId}
            onChange={(e) => setFilters((p) => ({ ...p, reservationId: e.target.value }))}
            placeholder="ex: 12"
            style={{ marginLeft: 8, padding: 6 }}
          />
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h3>Suivi</h3>
        {filtered.length === 0 ? (
          <p>Aucun bagage trouvé.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((b) => (
              <div key={b.bagage_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>Bagage #{b.bagage_id}</strong> — <span>{statusLabel(b.status)}</span>
                    {b.last_location ? <span> — {b.last_location}</span> : null}
                  </div>
                  <div style={{ color: '#555' }}>
                    {b.last_event_at ? new Date(b.last_event_at).toLocaleString('fr-FR') : ''}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <QRCodeSVG value={b.bagage_public_id} size={110} />
                  </div>
                  <div style={{ minWidth: 280 }}>
                    <div><strong>Code:</strong> <code>{b.bagage_public_id}</code></div>
                    <div><strong>Reservation:</strong> {b.reservation_id}</div>
                    <div><strong>Type:</strong> {b.bagage_type}</div>
                    <div><strong>Fragile:</strong> {b.fragile ? 'Oui' : 'Non'}</div>
                    <div><strong>Assistance:</strong> {b.assistance_required ? 'Oui' : 'Non'}</div>
                    {b.assistance_required ? (
                      <div style={{ marginTop: 6, color: '#8b5cf6', fontWeight: 600 }}>PMR prioritaire</div>
                    ) : null}
                    {b.reservation?.Lieu_depart && b.reservation?.Lieu_arrivee ? (
                      <div style={{ marginTop: 6, color: '#444' }}>
                        <strong>Trajet:</strong> {b.reservation.Lieu_depart} → {b.reservation.Lieu_arrivee}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => navigate(`/user/bagages/${b.bagage_id}`)}>
                      Voir détail
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(b.bagage_public_id);
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
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navigate('/user/voyages')}>← Retour voyages</button>
      </div>
    </div>
  );
};

export default BaggageDashboard;
