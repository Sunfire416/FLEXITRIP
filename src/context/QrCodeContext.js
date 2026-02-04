import React, { createContext, useState, useEffect, useContext } from "react";

// Create QrCodeContext
const QrCodeContext = createContext();

// Custom hook to use QrCodeContext
export const useQrCode = () => useContext(QrCodeContext);

// Provider to store QR Codes
export const QrCodeProvider = ({ children }) => {
  const [qrCodes, setQrCodes] = useState(() => {
    const savedQrCodes = localStorage.getItem("qrCodes");
    return savedQrCodes ? JSON.parse(savedQrCodes) : [];
  });

  // Save QR codes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("qrCodes", JSON.stringify(qrCodes));
  }, [qrCodes]);

  return (
    <QrCodeContext.Provider value={{ qrCodes, setQrCodes }}>
      {children}
    </QrCodeContext.Provider>
  );
};