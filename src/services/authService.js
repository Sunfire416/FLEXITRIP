// Logic for authentication service
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const api = axios.create({
    baseURL: API_BASE_URL, // Base URL de l'API (depuis env)
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000, // Timeout global
});

// Appel pour insérer un trajet SNCF
export const insertSNCFTrip = async (tripData) => {
    try {
        console.log("📤 Envoi vers API:", tripData); // LOG FRONTEND
        const response = await api.post('/SNCF/trajetSNCF/insert', tripData);
        console.log("✅ Réponse API:", response.data); // LOG SUCCESS
        return response.data;
    } catch (error) {
        console.error("❌ Erreur complète:", error); // LOG ERREUR
        console.error("❌ Response:", error.response); // LOG DÉTAIL
        console.error("❌ Data:", error.response?.data); // LOG MESSAGE
        
        if (error.response) {
            throw new Error(error.response.data.error || error.response.data.message || 'Erreur serveur');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('La requête a expiré. Veuillez réessayer.');
        } else {
            throw new Error('Impossible de se connecter au serveur.');
        }
    }
};

