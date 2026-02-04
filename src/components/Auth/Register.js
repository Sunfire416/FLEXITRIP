import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    telephone: '',
    isAgent: false,
    typeAgent: 'chauffeur_bus',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Créer l'utilisateur avec toutes les données dans metadata
      // Le trigger PostgreSQL créera automatiquement le profil/agent
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nom: formData.nom,
            prenom: formData.prenom,
            is_agent: formData.isAgent,
            type_agent: formData.typeAgent,
            telephone: formData.telephone,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Utilisateur non créé');

      // Attendre un peu que le trigger s'exécute
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('✅ Compte créé avec succès !');
      navigate('/');
    } catch (error) {
      console.error('Erreur inscription:', error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🚆 Plateforme MMT PMR</h2>
        <h3 style={styles.subtitle}>Créer un compte</h3>
        
        <form onSubmit={handleRegister} style={styles.form}>
          <input
            type="text"
            name="nom"
            placeholder="Nom"
            value={formData.nom}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            type="text"
            name="prenom"
            placeholder="Prénom"
            value={formData.prenom}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Mot de passe (min 6 caractères)"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
            minLength={6}
          />

          {!formData.isAgent && (
            <input
              type="tel"
              name="telephone"
              placeholder="Téléphone (optionnel)"
              value={formData.telephone}
              onChange={handleChange}
              style={styles.input}
            />
          )}

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="isAgent"
              checked={formData.isAgent}
              onChange={handleChange}
            />
            <span style={{ marginLeft: '8px' }}>Je suis un agent PMR</span>
          </label>

          {formData.isAgent && (
            <select
              name="typeAgent"
              value={formData.typeAgent}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="chauffeur_bus">Chauffeur Bus</option>
              <option value="agent_rail">Agent Rail (SNCF)</option>
              <option value="agent_airport">Agent Aéroport</option>
              <option value="vtc">Chauffeur VTC</option>
            </select>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Création...' : "S'inscrire"}
          </button>
        </form>

        <p style={styles.link}>
          Déjà inscrit ? <a href="/login">Se connecter</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '10px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
    fontWeight: 'normal',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  link: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
  },
};

export default Register;