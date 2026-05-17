import { useCallback, useState } from "react";

export type GeoPosition = { latitude: number; longitude: number };

export type GeoState = {
  loading: boolean;
  error: string | null;
  position: GeoPosition | null;
};

export const useUserLocation = () => {
  const [state, setState] = useState<GeoState>({ loading: false, error: null, position: null });

  const request = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setState({ loading: false, error: "Bu cihaz konum servisini desteklemiyor.", position: null });
        resolve(null);
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setState({ loading: false, error: null, position: p });
          resolve(p);
        },
        (err) => {
          setState({ loading: false, error: err.message || "Konum alınamadı", position: null });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 * 60 * 6 }
      );
    });
  }, []);

  return { ...state, request };
};
