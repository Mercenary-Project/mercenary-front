// mercenary-frontend/src/App.tsx

import React from 'react';
import MatchList from './components/MatchList';
import MatchDetail from './components/MatchDetail';

const App: React.FC = () => {
    const TEST_MATCH_ID = 1;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Mercenary High - Full Stack Demo</h1>

            {/* 1. 매치 목록 조회 */}
            <MatchList />

            <hr style={{ margin: '40px 0' }} />

            {/* 2. 매치 신청 기능 */}
            <MatchDetail matchId={TEST_MATCH_ID} />

        </div>
    );
};

export default App;