import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import MainBoard from './pages/MainBoard';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import MatchCreateForm from './pages/MatchCreateForm';
import MyMatchesPage from './pages/MyMatchesPage';
import { isAuthenticated as hasAccessToken, subscribeAuthChange } from './utils/auth';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasAccessToken());

    useEffect(() => {
        const syncAuthState = () => {
            setIsAuthenticated(hasAccessToken());
        };

        return subscribeAuthChange(syncAuthState);
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainBoard />} />
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" /> : <Login />}
                />
                <Route path="/login/callback" element={<LoginCallback />} />
                <Route
                    path="/match/create"
                    element={isAuthenticated ? <MatchCreateForm /> : <Navigate to="/login" />}
                />
                <Route
                    path="/match/:matchId/edit"
                    element={isAuthenticated ? <MatchCreateForm /> : <Navigate to="/login" />}
                />
                <Route
                    path="/mypage"
                    element={isAuthenticated ? <MyMatchesPage /> : <Navigate to="/login" />}
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;
