import React, { createContext, useState, useContext, useEffect } from "react";

// Créer le contexte pour les QR codes des bagages
const BaggageContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useBaggage = () => useContext(BaggageContext);

// Provider pour stocker les QR codes des bagages
export const BaggageProvider = ({ children }) => {
  const [baggageQrCodes, setBaggageQrCodes] = useState(() => {
    const savedBaggageQrCodes = localStorage.getItem("baggageQrCodes");
    return savedBaggageQrCodes ? JSON.parse(savedBaggageQrCodes) : [];
  });

  // Sauvegarder les QR codes dans localStorage lorsqu'ils changent
  useEffect(() => {
    localStorage.setItem("baggageQrCodes", JSON.stringify(baggageQrCodes));
  }, [baggageQrCodes]);

  return (
    <BaggageContext.Provider value={{ baggageQrCodes, setBaggageQrCodes }}>
      {children}
    </BaggageContext.Provider>
  );
};