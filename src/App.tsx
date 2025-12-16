// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainBoard from './pages/MainBoard';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';

const App: React.FC = () => {
    // 로그인 여부 확인
    const isAuthenticated = !!localStorage.getItem('accessToken');

    return (
        <Router>
            <Routes>
                {/* 메인 화면 */}
                <Route path="/" element={<MainBoard />} />

                {/* 로그인 관련 */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" /> : <Login />}
                />
                <Route path="/login/callback" element={<LoginCallback />} />

                {/* 잘못된 경로는 홈으로 리다이렉트 */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;