export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calcula a distância em metros entre duas coordenadas geográficas
 * utilizando a fórmula de Haversine.
 */
export function calculateHaversineDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const deltaLat = toRad(coord2.latitude - coord1.latitude);
  const deltaLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Valida se as coordenadas do cliente estão dentro do raio permitido do restaurante.
 */
export function verifyGeofence(
  clientCoords: Coordinates | undefined | null,
  restaurantCoords: { latitude?: number | null; longitude?: number | null },
  radiusMeters: number
): { verified: boolean; distanceMeters?: number; reason?: string } {
  // Se o restaurante não tem coordenadas cadastradas, geofencing não se aplica
  if (!restaurantCoords.latitude || !restaurantCoords.longitude) {
    return { verified: true, reason: 'Restaurante não possui geofencing ativo' };
  }

  // Se o cliente não forneceu coordenadas
  if (!clientCoords || clientCoords.latitude == null || clientCoords.longitude == null) {
    return { verified: false, reason: 'Coordenadas do cliente não informadas' };
  }

  const distance = calculateHaversineDistanceMeters(
    clientCoords,
    {
      latitude: restaurantCoords.latitude,
      longitude: restaurantCoords.longitude,
    }
  );

  const verified = distance <= radiusMeters;
  return {
    verified,
    distanceMeters: Math.round(distance),
    reason: verified
      ? `Dentro do raio (${Math.round(distance)}m <= ${radiusMeters}m)`
      : `Fora do raio permitido (${Math.round(distance)}m > ${radiusMeters}m)`,
  };
}
