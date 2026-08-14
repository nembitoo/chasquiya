// URL base del backend.
//
// IMPORTANTE: el teléfono NO puede usar "localhost" (para el teléfono, localhost
// es él mismo). Debe apuntar a la IP local de tu PC en la red Wi-Fi/LAN.
// Si tu IP cambia (otra red, reinicio del router), actualízala aquí.
//
// Para averiguar tu IP en Windows: ejecuta  ipconfig  y mira "IPv4".
export const API_URL = 'http://192.168.1.97:8080';

/** Mismo servidor, pero por WebSocket (chat en tiempo real). */
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';
