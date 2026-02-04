/* src/routes/PublicRoutes.js */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import HomePage from "../pages/HomePage";
import LoginPage from "../components/Login/Login";
import Signup from "../components/Signup/Signup";
import EwalletPage from "../pages/EwalletPage";

const PublicRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/ewallet" element={<EwalletPage />} />
        </Routes>
    );
};

export default PublicRoutes;
