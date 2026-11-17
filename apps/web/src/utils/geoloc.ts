export interface ClientCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Obtém a posição geográfica atual do cliente com timeout seguro
 */
export async function getClientCoordinates(): Promise<ClientCoordinates | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn('Geolocalização não concedida ou indisponível:', err.message);
        resolve(null);
      },
      {
        timeout: 5000,
        maximumAge: 60000,
        enableHighAccuracy: true,
      }
    );
  });
}
