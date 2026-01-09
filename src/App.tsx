import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainBoard from './pages/MainBoard';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import MatchCreateForm from './pages/MatchCreateForm';

const App: React.FC = () => {
    // 로컬 스토리지에 토큰이 있는지 확인 (로그인 여부 체크)
    const isAuthenticated = !!localStorage.getItem('accessToken');

    return (
        <Router>
            <Routes>
                {/* 메인 화면 */}
                <Route path="/" element={<MainBoard />} />

                {/* 로그인 화면 (이미 로그인했으면 메인으로 튕기기) */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" /> : <Login />}
                />
                <Route path="/login/callback" element={<LoginCallback />} />

                {/* 글쓰기 화면 */}
                <Route path="/match/create" element={<MatchCreateForm />} />

                {/* 이상한 주소로 오면 메인으로 보내기 */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;