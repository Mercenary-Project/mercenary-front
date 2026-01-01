import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainBoard from './pages/MainBoard';       // pages 폴더
import Login from './pages/Login';               // pages 폴더
import LoginCallback from './pages/LoginCallback'; // pages 폴더
import MatchCreateForm from './pages/MatchCreateForm'; // pages 폴더 (이동했음!)

const App: React.FC = () => {
    const isAuthenticated = !!localStorage.getItem('accessToken');

    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainBoard />} />
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" /> : <Login />}
                />
                <Route path="/login/callback" element={<LoginCallback />} />

                {/* 글쓰기 경로 추가 */}
                <Route path="/match/create" element={<MatchCreateForm />} />

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;