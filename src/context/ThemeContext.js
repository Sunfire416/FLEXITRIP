// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

// Création du contexte pour le thème
const ThemeContext = createContext();

// Fournisseur de contexte
export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false); // Mode sombre désactivé par défaut

    // Appliquer le mode sombre/claire au niveau du body
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode'); // Ajouter la classe "dark-mode" au body
        } else {
            document.body.classList.remove('dark-mode'); // Retirer la classe "dark-mode"
        }
    }, [darkMode]);

    // Basculer entre mode sombre et clair
    const toggleTheme = () => {
        setDarkMode((prevMode) => !prevMode);
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Hook personnalisé pour utiliser le contexte
export const useTheme = () => {
    return useContext(ThemeContext);
};

