// mercenary-frontend/src/components/MatchMap.tsx

import React, { useEffect, useRef } from 'react';

// 백엔드 데이터 구조와 일치해야 함
interface Match {
    matchId: number;
    placeName: string;
    latitude: number;  // 👈 여기가 핵심! 백엔드가 lat 이라고 보내면 못 받음
    longitude: number; // 👈 여기가 핵심! 백엔드가 lon 이라고 보내면 못 받음
}

interface MatchMapProps {
    matches: Match[];
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

const MatchMap: React.FC<MatchMapProps> = ({ matches }) => {
    const mapContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 🕵️‍♂️ [탐정 모드] 데이터 검증 로그
        console.log("====================================");
        console.log("🗺️ [MatchMap] 지도 그리기 시작!");
        console.log("📦 받은 데이터 개수:", matches.length);

        if (matches.length > 0) {
            console.log("🔍 첫 번째 데이터 구조 확인:", matches[0]);
            console.log("   👉 위도(latitude):", matches[0].latitude);
            console.log("   👉 경도(longitude):", matches[0].longitude);
        }
        console.log("====================================");

        if (!window.kakao || !mapContainer.current) return;

        // 지도 생성
        const options = {
            center: new window.kakao.maps.LatLng(37.498095, 127.027610), // 강남역
            level: 5
        };
        const map = new window.kakao.maps.Map(mapContainer.current, options);

        // 마커 찍기
        const bounds = new window.kakao.maps.LatLngBounds();
        let markerCount = 0;

        matches.forEach((match) => {
            // 좌표 값이 유효한지 체크
            if (match.latitude && match.longitude) {
                const markerPosition = new window.kakao.maps.LatLng(match.latitude, match.longitude);

                const marker = new window.kakao.maps.Marker({
                    position: markerPosition,
                    title: match.placeName
                });

                marker.setMap(map);
                bounds.extend(markerPosition);
                markerCount++;
            }
        });

        console.log(`📌 지도에 찍힌 마커 수: ${markerCount}개`);

        if (markerCount > 0) {
            map.setBounds(bounds); // 마커가 다 보이게 지도 범위 자동 조정
        }

    }, [matches]);

    return (
        <div style={{ marginTop: '20px', border: '2px solid #ddd', borderRadius: '8px', padding: '10px' }}>
            <h3>🗺️ 지도 보기 (Redis Geo 시각화)</h3>
            <div ref={mapContainer} style={{ width: '100%', height: '400px', borderRadius: '4px' }} />
        </div>
    );
};

export default MatchMap;