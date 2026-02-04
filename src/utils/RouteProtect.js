import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext';
import Spinner from '../components/Spinner/Spinner';
import SpinnerOverlay from '../components/Spinner/SpinnerOverlay';

const RouteProtect = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    // Log l'utilisateur actuel une seule fois pour éviter plusieurs logs
    useEffect(() => {
        if (!loading) {
            console.log("Utilisateur actuel :", user);
        }
    }, [loading, user]);

    // Affiche un spinner pendant le chargement
    if (loading) {
        return <SpinnerOverlay message="Chargement des données utilisateur..." />;
    }

    // Affiche le spinner tant que les données utilisateur sont en cours de chargement
    if (loading) {
        return <Spinner />;
    }

    // Affiche un état de chargement si les données utilisateur ne sont pas encore prêtes
    if (loading) {
        return <p>Chargement...</p>; // Vous pouvez remplacer par un spinner si nécessaire
    }

    // Redirige vers /login si l'utilisateur n'est pas authentifié
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Redirige si l'utilisateur tente d'accéder à /login ou /signup alors qu'il est connecté
    if (location.pathname === '/login' || location.pathname === '/signup') {
        return <Navigate to="/user/home" replace />;
    }

    // Vérifie si l'utilisateur a les rôles nécessaires
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/user/home" replace />;
    }

    // Affiche les enfants si tout est valide
    return children;
};

RouteProtect.propTypes = {
    children: PropTypes.node.isRequired,
    allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default RouteProtect;







