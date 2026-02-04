import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const CODES_PMR = ['BLND', 'DEAF', 'DPNA', 'WCHR', 'WCHS', 'WCHC', 'MAAS'];
const TYPES_REPAS = ['Standard', 'Végétarien', 'Végan', 'Halal', 'Kasher', 'Sans gluten', 'Diabétique'];
const ALLERGENES = ['Arachides', 'Fruits à coque', 'Gluten', 'Lactose', 'Œufs', 'Poisson', 'Crustacés', 'Soja', 'Sulfites'];

function GestionVoyageurs() {
  const [voyageurs, setVoyageurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    telephone: '',
    remarques: '',
    codes_pmr: [],
    preferences_repas: {
      type_repas: 'Standard',
      allergenes: [],
      remarques: '',
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoyageurs();
  }, []);

  const loadVoyageurs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('voyageurs_associes')
      .select('*')
      .eq('user_id', user.id)
      .order('prenom', { ascending: true });
    
    setVoyageurs(data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCodeToggle = (code) => {
    const codes = formData.codes_pmr;
    if (codes.includes(code)) {
      setFormData({ ...formData, codes_pmr: codes.filter(c => c !== code) });
    } else {
      setFormData({ ...formData, codes_pmr: [...codes, code] });
    }
  };

  const handleAllergeneToggle = (allergene) => {
    const allergenes = formData.preferences_repas.allergenes;
    if (allergenes.includes(allergene)) {
      setFormData({
        ...formData,
        preferences_repas: {
          ...formData.preferences_repas,
          allergenes: allergenes.filter(a => a !== allergene),
        },
      });
    } else {
      setFormData({
        ...formData,
        preferences_repas: {
          ...formData.preferences_repas,
          allergenes: [...allergenes, allergene],
        },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const voyageurData = {
        user_id: user.id,
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.date_naissance || null,
        telephone: formData.telephone,
        remarques: formData.remarques,
        codes_pmr: formData.codes_pmr,
        preferences_repas: formData.preferences_repas,
      };

      if (editingId) {
        // Mise à jour
        await supabase
          .from('voyageurs_associes')
          .update(voyageurData)
          .eq('id', editingId);
        alert('✅ Voyageur mis à jour !');
      } else {
        // Création
        await supabase
          .from('voyageurs_associes')
          .insert(voyageurData);
        alert('✅ Voyageur ajouté !');
      }

      // Reset
      setFormData({
        nom: '',
        prenom: '',
        date_naissance: '',
        telephone: '',
        remarques: '',
        codes_pmr: [],
        preferences_repas: { type_repas: 'Standard', allergenes: [], remarques: '' },
      });
      setShowForm(false);
      setEditingId(null);
      await loadVoyageurs();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (voyageur) => {
    setFormData({
      nom: voyageur.nom,
      prenom: voyageur.prenom,
      date_naissance: voyageur.date_naissance || '',
      telephone: voyageur.telephone || '',
      remarques: voyageur.remarques || '',
      codes_pmr: voyageur.codes_pmr || [],
      preferences_repas: voyageur.preferences_repas || { type_repas: 'Standard', allergenes: [], remarques: '' },
    });
    setEditingId(voyageur.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce voyageur ?')) return;

    try {
      await supabase.from('voyageurs_associes').delete().eq('id', id);
      alert('✅ Voyageur supprimé');
      await loadVoyageurs();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setFormData({
      nom: '',
      prenom: '',
      date_naissance: '',
      telephone: '',
      remarques: '',
      codes_pmr: [],
      preferences_repas: { type_repas: 'Standard', allergenes: [], remarques: '' },
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3>👥 Mes voyageurs</h3>
          <p style={styles.subtitle}>Gérez les personnes PMR que vous accompagnez</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.addBtn}>
            ➕ Ajouter un voyageur
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h4>{editingId ? '✏️ Modifier le voyageur' : '➕ Nouveau voyageur'}</h4>

          <div style={styles.section}>
            <label style={styles.label}>Informations personnelles</label>
            <div style={styles.grid}>
              <input
                type="text"
                name="nom"
                placeholder="Nom *"
                value={formData.nom}
                onChange={handleChange}
                required
                style={styles.input}
              />
              <input
                type="text"
                name="prenom"
                placeholder="Prénom *"
                value={formData.prenom}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.grid}>
              <input
                type="date"
                name="date_naissance"
                placeholder="Date de naissance"
                value={formData.date_naissance}
                onChange={handleChange}
                style={styles.input}
              />
              <input
                type="tel"
                name="telephone"
                placeholder="Téléphone"
                value={formData.telephone}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Codes PMR</label>
            <div style={styles.codesGrid}>
              {CODES_PMR.map(code => (
                <label key={code} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.codes_pmr.includes(code)}
                    onChange={() => handleCodeToggle(code)}
                  />
                  <span>{code}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Préférences repas</label>
            <select
              value={formData.preferences_repas.type_repas}
              onChange={(e) => setFormData({
                ...formData,
                preferences_repas: { ...formData.preferences_repas, type_repas: e.target.value }
              })}
              style={styles.input}
            >
              {TYPES_REPAS.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <label style={{...styles.label, marginTop: '15px'}}>Allergènes</label>
            <div style={styles.codesGrid}>
              {ALLERGENES.map(allergene => (
                <label key={allergene} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.preferences_repas.allergenes.includes(allergene)}
                    onChange={() => handleAllergeneToggle(allergene)}
                  />
                  <span>{allergene}</span>
                </label>
              ))}
            </div>

            <textarea
              placeholder="Remarques sur le repas"
              value={formData.preferences_repas.remarques}
              onChange={(e) => setFormData({
                ...formData,
                preferences_repas: { ...formData.preferences_repas, remarques: e.target.value }
              })}
              style={styles.textarea}
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Remarques générales</label>
            <textarea
              name="remarques"
              placeholder="Informations complémentaires"
              value={formData.remarques}
              onChange={handleChange}
              style={styles.textarea}
            />
          </div>

          <div style={styles.btnGroup}>
            <button type="submit" style={styles.saveBtn}>
              ✅ {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
              ❌ Annuler
            </button>
          </div>
        </form>
      )}

      {voyageurs.length === 0 && !showForm && (
        <div style={styles.empty}>
          <p>Aucun voyageur ajouté</p>
          <p style={styles.emptyHint}>Ajoutez les personnes PMR que vous accompagnez</p>
        </div>
      )}

      <div style={styles.voyageursList}>
        {voyageurs.map(voyageur => (
          <div key={voyageur.id} style={styles.voyageurCard}>
            <div style={styles.cardHeader}>
              <div>
                <h4>{voyageur.prenom} {voyageur.nom}</h4>
                {voyageur.date_naissance && (
                  <p style={styles.info}>
                    🎂 {new Date(voyageur.date_naissance).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div style={styles.actions}>
                <button onClick={() => handleEdit(voyageur)} style={styles.editBtn}>
                  ✏️
                </button>
                <button onClick={() => handleDelete(voyageur.id)} style={styles.deleteBtn}>
                  🗑️
                </button>
              </div>
            </div>

            {voyageur.codes_pmr && voyageur.codes_pmr.length > 0 && (
              <div style={styles.cardSection}>
                <strong>Codes PMR :</strong>
                <div style={styles.tags}>
                  {voyageur.codes_pmr.map(code => (
                    <span key={code} style={styles.tag}>{code}</span>
                  ))}
                </div>
              </div>
            )}

            {voyageur.preferences_repas && (
              <div style={styles.cardSection}>
                <strong>Repas :</strong> {voyageur.preferences_repas.type_repas || 'Standard'}
                {voyageur.preferences_repas.allergenes && voyageur.preferences_repas.allergenes.length > 0 && (
                  <div style={styles.tags}>
                    {voyageur.preferences_repas.allergenes.map(allergene => (
                      <span key={allergene} style={styles.allergeneTag}>{allergene}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {voyageur.remarques && (
              <div style={styles.cardSection}>
                <strong>Remarques :</strong> {voyageur.remarques}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  addBtn: {
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  form: {
    background: '#f8f9fa',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  section: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
  },
  codesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    fontFamily: 'inherit',
    marginTop: '10px',
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    color: '#666',
  },
  emptyHint: {
    fontSize: '14px',
    marginTop: '10px',
  },
  voyageursList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  voyageurCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #e3f2fd',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  info: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cardSection: {
    marginTop: '12px',
    fontSize: '14px',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  tag: {
    padding: '4px 10px',
    background: '#fff3cd',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#856404',
  },
  allergeneTag: {
    padding: '4px 10px',
    background: '#f8d7da',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#721c24',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
};

export default GestionVoyageurs;
