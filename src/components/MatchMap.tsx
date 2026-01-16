import React, { useEffect, useRef } from 'react';

// MainBoard와 타입을 맞추기 위해 속성을 조금 더 추가했습니다.
export interface Match {
    matchId: number;
    placeName: string;
    latitude: number;
    longitude: number;
    title?: string;
    matchDate?: string; // MainBoard에서 넘겨주는 데이터 호환용
    distance?: number;  // MainBoard에서 넘겨주는 데이터 호환용
}

// 부모(MainBoard)로부터 받을 Props 정의
interface MatchMapProps {
    matches: Match[];
    center?: { lat: number, lng: number } | null;
    // ✅ [추가] 클릭 이벤트를 받기 위한 함수 타입 정의
    onMarkerClick?: (id: number) => void;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

const MatchMap: React.FC<MatchMapProps> = ({ matches, center, onMarkerClick }) => {
    const mapContainer = useRef<HTMLDivElement>(null);

    // 1. 지도 객체를 저장할 Ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);

    // 2. 현재 지도에 찍힌 마커들을 저장할 Ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);

    // ✅ [초기화] 지도를 처음에 한 번만 생성
    useEffect(() => {
        if (!window.kakao || !mapContainer.current) return;
        if (mapRef.current) return;

        console.log("🗺️ [MatchMap] 지도 초기화");

        const options = {
            center: new window.kakao.maps.LatLng(
                center?.lat || 37.498095,
                center?.lng || 127.027610
            ),
            level: 5
        };

        mapRef.current = new window.kakao.maps.Map(mapContainer.current, options);
    }, []);


    // ✅ [이동] center props가 바뀌면 지도 중심 이동
    useEffect(() => {
        if (!mapRef.current || !window.kakao || !center) return;

        console.log(`📍 [MatchMap] 지도 중심 이동 -> 위도: ${center.lat}, 경도: ${center.lng}`);

        const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng);
        mapRef.current.panTo(moveLatLon);

    }, [center]);


    // ✅ [마커] matches 데이터가 바뀌면 마커 다시 찍기 + 클릭 이벤트 연결
    useEffect(() => {
        if (!mapRef.current || !window.kakao) return;

        console.log(`📦 [MatchMap] 마커 업데이트: ${matches.length}개`);

        // 1. 기존 마커 싹 지우기 (지도에서 제거)
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // 2. 새 마커 찍기
        matches.forEach((match) => {
            if (match.latitude && match.longitude) {
                const markerPosition = new window.kakao.maps.LatLng(match.latitude, match.longitude);

                const marker = new window.kakao.maps.Marker({
                    position: markerPosition,
                    title: match.placeName || match.title
                });

                // 지도에 올리기
                marker.setMap(mapRef.current);

                // ✅ [추가됨] 마커에 클릭 이벤트 리스너 등록 (SDK 방식)
                if (onMarkerClick) {
                    window.kakao.maps.event.addListener(marker, 'click', function() {
                        onMarkerClick(match.matchId); // 클릭 시 부모 함수 실행
                    });
                }

                // 생성된 마커를 배열에 저장
                markersRef.current.push(marker);
            }
        });

    }, [matches, onMarkerClick]); // matches나 클릭 핸들러가 바뀌면 다시 그리기

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                ref={mapContainer}
                style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#eee' }}
            />
        </div>
    );
};

export default MatchMap;