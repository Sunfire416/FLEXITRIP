import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const CODES_PMR_DISPONIBLES = [
  { code: 'BLND', description: 'Passager malvoyant ou non voyant, avec ou sans chien guide' },
  { code: 'DEAF', description: 'Passager malentendant ou sourd' },
  { code: 'DPNA', description: 'Passager ayant une déficience intellectuelle ou comportementale' },
  { code: 'WCHR', description: 'Besoin d\'un fauteuil roulant pour se déplacer, peut monter/descendre escaliers' },
  { code: 'WCHS', description: 'Besoin d\'aide pour escaliers et fauteuil roulant, peut se déplacer en cabine' },
  { code: 'WCHC', description: 'Totalement immobile, besoin d\'aide à tout moment' },
  { code: 'MAAS', description: 'Besoin d\'aide ne correspondant à aucune autre catégorie' },
];

function Profil() {
  const [profile, setProfile] = useState(null);
  const [codesPmr, setCodesPmr] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [preferences, setPreferences] = useState({
    type_repas: 'standard',
    allergenes: [],
    regime_special: '',
    remarques: '',
  });
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    photo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const ALLERGENES_DISPONIBLES = [
    'Arachides',
    'Fruits à coque',
    'Gluten',
    'Lactose',
    'Œufs',
    'Poisson',
    'Crustacés',
    'Soja',
    'Sulfites',
  ];

  const TYPES_REPAS = [
    { value: 'standard', label: 'Standard' },
    { value: 'vegetarien', label: 'Végétarien' },
    { value: 'vegan', label: 'Végan' },
    { value: 'halal', label: 'Halal' },
    { value: 'kasher', label: 'Kasher' },
    { value: 'sans_gluten', label: 'Sans gluten' },
    { value: 'diabetique', label: 'Diabétique' },
  ];

  useEffect(() => {
    loadProfile();
    loadCodesPmr();
    loadPreferences();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setPhotoUrl(data.photo_url || '');
      setFormData({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone || '',
        photo_url: data.photo_url || '',
      });
    }
    setLoading(false);
  };

  const loadCodesPmr = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const { data } = await supabase
        .from('pmr_codes')
        .select('*')
        .eq('profile_id', profileData.id)
        .eq('actif', true);

      setCodesPmr(data || []);
      setSelectedCodes((data || []).map(c => c.code));
    }
  };

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('preferences_repas')
      .eq('user_id', user.id)
      .single();

    if (profileData && profileData.preferences_repas) {
      setPreferences(profileData.preferences_repas);
    }
  };

  const handlePhotoUpload = async () => {
    setUploadingPhoto(true);
    
    try {
      // SIMULATION : Utiliser une photo aléatoire Unsplash
      // Dans une vraie app, ce serait un vrai upload fichier
      const simulatedPhotoUrl = `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 50)}.jpg`;
      
      // Mettre à jour le profil avec la photo
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: simulatedPhotoUrl })
        .eq('id', profile.id);

      if (error) throw error;

      setPhotoUrl(simulatedPhotoUrl);
      alert('✅ Photo mise à jour !');
      await loadProfile();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la mise à jour de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCodeToggle = (code) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter(c => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Mettre à jour le profil avec préférences
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone,
          preferences_repas: preferences,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Désactiver tous les anciens codes
      await supabase
        .from('pmr_codes')
        .update({ actif: false })
        .eq('profile_id', profile.id);

      // Ajouter les nouveaux codes sélectionnés
      if (selectedCodes.length > 0) {
        const codesToInsert = selectedCodes.map(code => ({
          profile_id: profile.id,
          code: code,
          description: CODES_PMR_DISPONIBLES.find(c => c.code === code)?.description || '',
          actif: true,
        }));

        const { error: codesError } = await supabase
          .from('pmr_codes')
          .insert(codesToInsert);

        if (codesError) throw codesError;
      }

      alert('✅ Profil mis à jour avec succès !');
      setEditing(false);
      await loadProfile();
      await loadCodesPmr();
      await loadPreferences();
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la mise à jour du profil');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>🚆 MMT PMR</h1>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← Retour
        </button>
      </nav>

      <div style={styles.content}>
        <h2>👤 Mon Profil</h2>
        <p style={styles.subtitle}>Gérez vos informations et codes d'assistance PMR</p>

        <div style={styles.card}>
          <h3>Informations personnelles</h3>
          
          {!editing ? (
            <div style={styles.infoSection}>
              {photoUrl && (
                <div style={styles.photoSection}>
                  <img src={photoUrl} alt="Photo profil" style={styles.profilePhoto} />
                </div>
              )}
              <div style={styles.infoRow}>
                <strong>Nom :</strong> {profile?.nom}
              </div>
              <div style={styles.infoRow}>
                <strong>Prénom :</strong> {profile?.prenom}
              </div>
              <div style={styles.infoRow}>
                <strong>Email :</strong> {profile?.email}
              </div>
              <div style={styles.infoRow}>
                <strong>Téléphone :</strong> {profile?.telephone || 'Non renseigné'}
              </div>
              <button onClick={() => setEditing(true)} style={styles.editBtn}>
                ✏️ Modifier mes informations
              </button>
            </div>
          ) : (
            <div style={styles.formSection}>
              <div style={styles.photoUploadSection}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Photo profil" style={styles.profilePhoto} />
                ) : (
                  <div style={styles.noPhoto}>📷 Pas de photo</div>
                )}
                <button 
                  onClick={handlePhotoUpload} 
                  disabled={uploadingPhoto}
                  style={styles.uploadPhotoBtn}
                >
                  {uploadingPhoto ? '⏳ Upload...' : '📸 Changer la photo'}
                </button>
                <p style={styles.hint}>Photo pour reconnaissance faciale</p>
              </div>
              <input
                type="text"
                name="nom"
                placeholder="Nom"
                value={formData.nom}
                onChange={handleChange}
                style={styles.input}
              />
              <input
                type="text"
                name="prenom"
                placeholder="Prénom"
                value={formData.prenom}
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
              <div style={styles.btnGroup}>
                <button onClick={handleSaveProfile} style={styles.saveBtn}>
                  ✅ Enregistrer
                </button>
                <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
                  ❌ Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3>♿ Codes d'assistance PMR</h3>
          <p style={styles.hint}>
            Sélectionnez les codes correspondant à vos besoins d'assistance
          </p>

          {!editing && codesPmr.length === 0 ? (
            <div style={styles.noCodes}>
              <p>Aucun code PMR enregistré</p>
              <button onClick={() => setEditing(true)} style={styles.addBtn}>
                ➕ Ajouter des codes PMR
              </button>
            </div>
          ) : null}

          {!editing && codesPmr.length > 0 ? (
            <div style={styles.codesDisplay}>
              {codesPmr.map((code) => (
                <div key={code.id} style={styles.codeTag}>
                  <strong>{code.code}</strong>
                  <p>{code.description}</p>
                </div>
              ))}
              <button onClick={() => setEditing(true)} style={styles.editBtn}>
                ✏️ Modifier les codes
              </button>
            </div>
          ) : null}

          {editing && (
            <div style={styles.codesSelector}>
              {CODES_PMR_DISPONIBLES.map((item) => (
                <label key={item.code} style={styles.codeOption}>
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(item.code)}
                    onChange={() => handleCodeToggle(item.code)}
                  />
                  <div style={styles.codeInfo}>
                    <strong>{item.code}</strong>
                    <p>{item.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3>🍽️ Préférences repas et allergènes</h3>
          <p style={styles.hint}>
            Ces préférences seront utilisées lors de vos enregistrements
          </p>

          {!editing ? (
            <div style={styles.preferencesDisplay}>
              <div style={styles.prefRow}>
                <strong>Type de repas :</strong>
                <span>{TYPES_REPAS.find(t => t.value === preferences.type_repas)?.label || 'Standard'}</span>
              </div>
              
              {preferences.allergenes && preferences.allergenes.length > 0 && (
                <div style={styles.prefRow}>
                  <strong>Allergènes :</strong>
                  <span>{preferences.allergenes.join(', ')}</span>
                </div>
              )}
              
              {preferences.regime_special && (
                <div style={styles.prefRow}>
                  <strong>Régime spécial :</strong>
                  <span>{preferences.regime_special}</span>
                </div>
              )}
              
              {preferences.remarques && (
                <div style={styles.prefRow}>
                  <strong>Remarques :</strong>
                  <span>{preferences.remarques}</span>
                </div>
              )}
              
              {!preferences.type_repas && !preferences.allergenes?.length && (
                <div style={styles.noCodes}>
                  <p>Aucune préférence enregistrée</p>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.preferencesForm}>
              <label style={styles.label}>Type de repas</label>
              <select
                value={preferences.type_repas}
                onChange={(e) => setPreferences({...preferences, type_repas: e.target.value})}
                style={styles.input}
              >
                {TYPES_REPAS.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <label style={styles.label}>Allergènes</label>
              <div style={styles.allergenesList}>
                {ALLERGENES_DISPONIBLES.map(allergene => (
                  <label key={allergene} style={styles.allergeneOption}>
                    <input
                      type="checkbox"
                      checked={preferences.allergenes?.includes(allergene) || false}
                      onChange={(e) => {
                        const newAllergenes = e.target.checked
                          ? [...(preferences.allergenes || []), allergene]
                          : (preferences.allergenes || []).filter(a => a !== allergene);
                        setPreferences({...preferences, allergenes: newAllergenes});
                      }}
                    />
                    <span>{allergene}</span>
                  </label>
                ))}
              </div>

              <label style={styles.label}>Régime spécial</label>
              <input
                type="text"
                placeholder="Ex: Sans sucre, pauvre en sel..."
                value={preferences.regime_special}
                onChange={(e) => setPreferences({...preferences, regime_special: e.target.value})}
                style={styles.input}
              />

              <label style={styles.label}>Remarques</label>
              <textarea
                placeholder="Autres remarques concernant vos repas..."
                value={preferences.remarques}
                onChange={(e) => setPreferences({...preferences, remarques: e.target.value})}
                style={styles.textarea}
              />
            </div>
          )}
        </div>
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
  card: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoSection: {
    marginTop: '15px',
  },
  photoSection: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  profilePhoto: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #667eea',
  },
  photoUploadSection: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  noPhoto: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    background: '#ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: '40px',
  },
  uploadPhotoBtn: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  infoRow: {
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  formSection: {
    marginTop: '15px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  editBtn: {
    marginTop: '20px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
  hint: {
    fontSize: '14px',
    color: '#666',
    marginTop: '10px',
  },
  noCodes: {
    textAlign: 'center',
    padding: '30px',
    color: '#999',
  },
  addBtn: {
    marginTop: '15px',
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  codesDisplay: {
    marginTop: '15px',
  },
  codeTag: {
    padding: '15px',
    background: '#fff3cd',
    borderRadius: '8px',
    marginBottom: '10px',
    borderLeft: '4px solid #ffc107',
  },
  codesSelector: {
    marginTop: '15px',
  },
  codeOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '10px',
    cursor: 'pointer',
  },
  codeInfo: {
    flex: 1,
  },
  preferencesDisplay: {
    marginTop: '15px',
  },
  prefRow: {
    padding: '12px 0',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
  },
  preferencesForm: {
    marginTop: '15px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginTop: '15px',
    marginBottom: '5px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  allergenesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  allergeneOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
};

export default Profil;
