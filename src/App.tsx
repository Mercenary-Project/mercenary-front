import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import MainBoard from './pages/MainBoard';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import MatchCreateForm from './pages/MatchCreateForm';
import MyMatchesPage from './pages/MyMatchesPage';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
    const { isAuthenticated } = useAuth();

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
                    element={<PrivateRoute><MatchCreateForm /></PrivateRoute>}
                />
                <Route
                    path="/match/:matchId/edit"
                    element={<PrivateRoute><MatchCreateForm /></PrivateRoute>}
                />
                <Route
                    path="/mypage"
                    element={<PrivateRoute><MyMatchesPage /></PrivateRoute>}
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;
