/* src/routes/ProtectedRoutes.js */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import RouteProtect from "../utils/RouteProtect";
import HomePage from "../pages/HomePage";
import EwalletPage from "../pages/EwalletPage";
import ProfilePage from "../components/Profile/Profile";
import UserSettingsPage from "../components/User_settings/User_settings";
import EditUser from '../components/EditerProfil/EditProfil';
import BoardingPage from '../pages/BoardingPage';
import BoardingGatePage from '../pages/BoardingGatePage';

const ProtectedRoutes = () => {
    return (
        <Routes>
            <Route
                path="/user/home"
                element={<RouteProtect><HomePage /></RouteProtect>}
            />
            <Route
                path="/user/voyages"
                element={<RouteProtect><HomePage /></RouteProtect>}
            />
            <Route
                path="/user/checkin"
                element={<RouteProtect><HomePage /></RouteProtect>}
            />
            <Route
                path="/user/ewallet"
                element={<RouteProtect><EwalletPage /></RouteProtect>}
            />
            <Route
                path="/user/profile"
                element={<RouteProtect><ProfilePage /></RouteProtect>}
            />
            <Route 
                path="/user/edit-profile"
                element={<RouteProtect><EditUser /></RouteProtect>}
            />
            <Route
                path="/user/settings"
                element={<RouteProtect><UserSettingsPage /></RouteProtect>}
            />
            <Route
                path="/user/boarding"
                element={<RouteProtect><BoardingPage /></RouteProtect>}
            />
            <Route
                path="/user/boarding-gate"
                element={<RouteProtect><BoardingGatePage /></RouteProtect>}
            />
            <Route
                path="/user/notifications"
                element={<RouteProtect><HomePage /></RouteProtect>}
            />
        </Routes>
    );
};

export default ProtectedRoutes;
