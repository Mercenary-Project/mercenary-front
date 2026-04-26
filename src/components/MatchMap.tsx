import React, { useEffect, useRef } from 'react';

import type { PositionSlot } from '../types/match';

export interface Match {
    matchId: number;
    placeName: string;
    latitude: number;
    longitude: number;
    title?: string;
    matchDate?: string;
    distance?: number;
    slots?: PositionSlot[];
    isFullyBooked?: boolean;
    status?: string;
}

interface MatchMapProps {
    matches: Match[];
    center?: { lat: number; lng: number } | null;
    onMarkerClick?: (id: number) => void;
}

const MatchMap: React.FC<MatchMapProps> = ({ matches, center, onMarkerClick }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<KakaoMap | null>(null);
    const markersRef = useRef<KakaoMarker[]>([]);
    const initialCenterRef = useRef(center);

    useEffect(() => {
        if (!window.kakao || !mapContainer.current || mapRef.current) {
            return;
        }

        const options = {
            center: new window.kakao.maps.LatLng(
                initialCenterRef.current?.lat || 37.498095,
                initialCenterRef.current?.lng || 127.02761,
            ),
            level: 5,
        };

        mapRef.current = new window.kakao.maps.Map(mapContainer.current, options);
    }, []);

    useEffect(() => {
        if (!mapRef.current || !window.kakao || !center) {
            return;
        }

        const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng);
        mapRef.current.panTo(moveLatLon);
    }, [center]);

    useEffect(() => {
        if (!mapRef.current || !window.kakao) {
            return;
        }

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        matches.forEach((match) => {
            if (!match.latitude || !match.longitude) {
                return;
            }

            const markerPosition = new window.kakao.maps.LatLng(match.latitude, match.longitude);
            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                title: match.placeName || match.title,
            });

            marker.setMap(mapRef.current);

            if (onMarkerClick) {
                window.kakao.maps.event.addListener(marker, 'click', () => {
                    onMarkerClick(match.matchId);
                });
            }

            markersRef.current.push(marker);
        });
    }, [matches, onMarkerClick]);

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
