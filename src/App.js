import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Auth
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Voyageur
import DashboardVoyageur from './components/Voyageur/Dashboard';
import Reservation from './components/Voyageur/Reservation';
import Enregistrement from './components/Voyageur/Enregistrement';
import MesVoyages from './components/Voyageur/MesVoyages';
import Profil from './components/Voyageur/Profil';
import GestionVoyageurs from './components/Voyageur/GestionVoyageurs'; // ÉTAPE 8
import Facturation from './components/Voyageur/Facturation'; // ÉTAPE 9

// Agent
import DashboardAgent from './components/Agent/DashboardAgent';
import PriseEnCharge from './components/Agent/PriseEnCharge';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'voyageur' ou 'agent'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId) => {
    // Vérifier si c'est un agent PMR
    const { data: agent } = await supabase
      .from('agents_pmr')
      .select('id')
      .eq('user_id', userId)
      .single();

    setUserRole(agent ? 'agent' : 'voyageur');
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />

        {/* Routes protégées - Voyageur */}
        {session && userRole === 'voyageur' && (
          <>
            <Route path="/" element={<DashboardVoyageur />} />
            <Route path="/mes-voyages" element={<MesVoyages />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/enregistrement/:reservationId" element={<Enregistrement />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/voyageurs" element={<GestionVoyageurs />} /> {/* ÉTAPE 8 */}
            <Route path="/factures" element={<Facturation />} /> {/* ÉTAPE 9 */}
          </>
        )}

        {/* Routes protégées - Agent */}
        {session && userRole === 'agent' && (
          <>
            <Route path="/" element={<DashboardAgent />} />
            <Route path="/prise-en-charge/:reservationId" element={<PriseEnCharge />} />
          </>
        )}

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to={session ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
