interface Window {
    kakao: KakaoNamespace;
}

interface KakaoNamespace {
    maps: KakaoMaps;
}

interface KakaoMaps {
    load: (callback: () => void) => void;
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
    Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    event: KakaoEvent;
    services: KakaoServices;
}

interface KakaoMapOptions {
    center: KakaoLatLng;
    level?: number;
}

interface KakaoMap {
    setCenter: (latlng: KakaoLatLng) => void;
    getCenter: () => KakaoLatLng;
    panTo: (latlng: KakaoLatLng) => void;
}

interface KakaoMarkerOptions {
    position: KakaoLatLng;
    map?: KakaoMap;
    title?: string;
}

interface KakaoMarker {
    setMap: (map: KakaoMap | null) => void;
    setPosition: (latlng: KakaoLatLng) => void;
}

interface KakaoLatLng {
    getLat: () => number;
    getLng: () => number;
}

interface KakaoEvent {
    addListener: (target: KakaoMap | KakaoMarker, type: string, handler: (e: KakaoMouseEvent) => void) => void;
}

interface KakaoMouseEvent {
    latLng: KakaoLatLng;
}

interface KakaoServices {
    Geocoder: new () => KakaoGeocoder;
    Places: new () => KakaoPlaces;
    Status: {
        OK: string;
        ZERO_RESULT: string;
        ERROR: string;
    };
}

interface KakaoGeocoderResult {
    address: {
        address_name: string;
        region_2depth_name: string;
    };
    road_address: {
        address_name: string;
    } | null;
}

interface KakaoGeocoder {
    coord2Address: (
        lng: number,
        lat: number,
        callback: (result: KakaoGeocoderResult[], status: string) => void,
    ) => void;
}

interface KakaoPlaceResult {
    place_name: string;
    x: string;
    y: string;
}

interface KakaoPlaces {
    keywordSearch: (
        keyword: string,
        callback: (result: KakaoPlaceResult[], status: string) => void,
    ) => void;
}
