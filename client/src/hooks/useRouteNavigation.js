import { useEffect, useRef, useState } from 'react';
import { requestDirections, routeSummary, saveRecentRoute } from '../services/navigationService';

function useRouteNavigation(origin, destination) {
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  // Five decimal places avoids rerouting for sub-meter GPS jitter.
  const originLatitude = Number.isFinite(origin?.latitude) ? Number(origin.latitude.toFixed(5)) : null;
  const originLongitude = Number.isFinite(origin?.longitude) ? Number(origin.longitude.toFixed(5)) : null;
  const destinationLatitude = destination?.latitude;
  const destinationLongitude = destination?.longitude;
  const destinationPlaceId = destination?.placeId;
  const destinationName = destination?.name;
  const destinationCategory = destination?.categoryLabel;

  useEffect(() => {
    if (![originLatitude, originLongitude, destinationLatitude, destinationLongitude].every(Number.isFinite)) {
      setDirections(null);
      setRouteInfo(null);
      setError('');
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      requestDirections(
        { latitude: originLatitude, longitude: originLongitude },
        { latitude: destinationLatitude, longitude: destinationLongitude },
        travelMode
      )
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          const summary = routeSummary(result);
          // Navigation opens externally; the in-app map displays only an estimate.
          setDirections(null);
          setRouteInfo(summary);
          if (summary) {
            try {
              saveRecentRoute({
                placeId: destinationPlaceId,
                name: destinationName,
                category: destinationCategory,
                latitude: destinationLatitude,
                longitude: destinationLongitude,
                travelMode,
                ...summary
              });
            } catch { /* route display should not fail when storage is blocked */ }
          }
        })
        .catch((routeError) => {
          if (requestId !== requestIdRef.current) return;
          setDirections(null);
          setRouteInfo(null);
          setError(routeError.message || 'Route unavailable.');
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 700);

    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [destinationCategory, destinationLatitude, destinationLongitude, destinationName, destinationPlaceId, originLatitude, originLongitude, travelMode]);

  const clearRoute = () => {
    requestIdRef.current += 1;
    setDirections(null);
    setRouteInfo(null);
    setError('');
    setLoading(false);
  };

  return { travelMode, setTravelMode, directions, routeInfo, loading, error, clearRoute };
}

export default useRouteNavigation;
