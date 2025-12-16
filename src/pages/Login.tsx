// src/pages/Login.tsx
import React from 'react';

const Login: React.FC = () => {
    // 카카오 개발자 센터에서 발급받은 REST API 키
    const REST_API_KEY = "7d14f9ab2e737ea77a60f2c1bffce860";
    const REDIRECT_URI = "http://localhost:5173/login/callback";
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;

    const handleKakaoLogin = () => {
        window.location.href = KAKAO_AUTH_URL;
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h1 style={styles.title}>⚽ Mercenary High</h1>
                <p style={styles.subtitle}>실시간 용병 매칭 서비스</p>

                <button onClick={handleKakaoLogin} style={styles.kakaoBtn}>
                    <span style={{ marginRight: '8px' }}>🟡</span>
                    카카오로 1초 시작하기
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', backgroundColor: '#1E293B',
    },
    loginBox: {
        backgroundColor: '#fff', padding: '40px', borderRadius: '16px',
        textAlign: 'center' as const, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', width: '320px'
    },
    title: { color: '#10B981', margin: '0 0 10px 0' },
    subtitle: { color: '#64748B', marginBottom: '30px' },
    kakaoBtn: {
        width: '100%', padding: '12px', backgroundColor: '#FEE500',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '16px', fontWeight: 'bold' as const, color: '#3C1E1E'
    }
};

export default Login;