// Comunas de Santiago con coordenadas de referencia (centro aproximado).
// El maestro elige una; esas coordenadas alimentan el punto PostGIS del backend.
// El mapa fino y el GPS del cliente llegan en el Hito 3.

export type Comuna = {
  nombre: string;
  latitud: number;
  longitud: number;
};

export const COMUNAS: Comuna[] = [
  { nombre: 'Santiago Centro', latitud: -33.4489, longitud: -70.6693 },
  { nombre: 'Providencia', latitud: -33.4314, longitud: -70.6093 },
  { nombre: 'Las Condes', latitud: -33.4084, longitud: -70.542 },
  { nombre: 'Ñuñoa', latitud: -33.4569, longitud: -70.598 },
  { nombre: 'Maipú', latitud: -33.511, longitud: -70.758 },
  { nombre: 'La Florida', latitud: -33.523, longitud: -70.599 },
  { nombre: 'Puente Alto', latitud: -33.611, longitud: -70.576 },
  { nombre: 'Recoleta', latitud: -33.41, longitud: -70.64 },
  { nombre: 'Estación Central', latitud: -33.461, longitud: -70.698 },
  { nombre: 'La Reina', latitud: -33.45, longitud: -70.54 },
];
