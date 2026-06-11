# Pax List Angular (Demo)

Una aplicación web moderna para tripulantes de cabina que permite gestionar y visualizar la lista de pasajeros (Pax List) de manera interactiva a través de un mapa de asientos (Seat Map), tomar comandas de comida y llevar estadísticas de vuelo.

Este proyecto fue originalmente creado en React y ha sido migrado meticulosamente a **Angular** (utilizando Signals y el nuevo Control Flow), ofreciendo una experiencia dinámica y ultra fluida mediante **TailwindCSS**.

## 🚀 Características

- **Selector de Vuelos:** Permite elegir entre diversos vuelos de prueba con diferentes tipos de aeronave (por ejemplo A320 y B787).
- **Seat Map Interactivo:** Visualiza la distribución real de la cabina de la aeronave. Los asientos se adaptan de forma reactiva según su estado.
- **Modo Comanda:** Interfaz especializada, rápida y adaptativa para la toma de órdenes de comida durante el vuelo.
- **Dashboard de Estadísticas:** Barra lateral completa que expone en tiempo real las estadísticas de los pasajeros (SSRs, status, membresías).
- **Control de Estado (Signals):** `StoreService` centralizado actuando como única fuente de verdad (Single Source of Truth).

## 🛠 Instalación y Uso Local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Ejecuta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   *(También puedes usar `npm start` o `ng serve`)*

3. Abre tu navegador y dirígete a `http://localhost:4200`.

---

## 🔗 Visión y Arquitectura para Integración con API Real

Actualmente, la aplicación se alimenta de un inventario local en caché (`mockData.ts` y `aircraftConfigs.ts`). **Para escalar a un entorno en vivo o en producción**, el siguiente paso es conectar la aplicación a un backend real mediante una API.

### Roadmap de Conexión:
1. **Consumo Dinámico de Vuelos (REST / GraphQL):**
   - Reemplazar el `mockData.ts` creando servicios de Angular (ej. `FlightApiService`, `MenuApiService`) usando `HttpClient` para traer el manifiesto de pasajeros real según el número de vuelo y la fecha.
   - Ejemplo de flujo en `store.service.ts`:
     ```typescript
     this.http.get<FlightManifest>(`/api/v1/flights/${flightId}/manifest`)
       .subscribe(data => this.manifest.set(data));
     ```

2. **Sincronización Colaborativa (WebSockets / SSE):**
   - Las comandas tomadas por un tripulante en un lado del pasillo deben reflejarse de inmediato en el dispositivo de sus compañeros.
   - Esto se puede lograr inyectando un servicio de `Socket.io` o *SignalR* directamente en el `StoreService` para despachar eventos de tipo `ORDER_UPDATED` a todos los clientes.

3. **Arquitectura Offline-First:**
   - La conexión en el aire no siempre está garantizada. Integrar un *Service Worker* (Angular PWA) y almacenar el estado de las comandas en **IndexedDB**. 
   - Las modificaciones se guardarían localmente y se enviarían en lotes (batching) tan pronto se detecte de nuevo conectividad (o al aterrizar).

## 📦 Stack Tecnológico

- **Framework:** Angular (Signals, Standalone Components, New Control Flow)
- **Diseño & UI:** TailwindCSS
- **Iconos:** Lucide-Angular
- **Lógica de Dominio:** TypeScript Estricto
