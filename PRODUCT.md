# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Register

product

## Users
Tripulación de cabina (TC) de Avianca que trabaja en un entorno de vuelo dinámico, rápido y con diferentes condiciones de iluminación (cabinas de pasajeros con luz tenue o resplandor de sol). Necesitan tomar decisiones rápidas, verificar de un vistazo el estatus de lealtad (LifeMiles VIP), alertar incidencias NPS anteriores y gestionar comandas de comida en clase Business.

## Product Purpose
Avianca SeatMap Pro es una herramienta de soporte a bordo offline-first que asiste a los tripulantes de cabina en la asignación de asientos, priorización de pasajeros Elite, recuperación del servicio NPS y toma del inventario de platos de catering en tiempo real.

## Brand Personality
Profesional, Eficiente, Confiable. Un diseño de grado de aviación que se siente como un instrumento operativo de vuelo oficial de Avianca, evitando adornos innecesarios o modas temporales de diseño SaaS.

## Anti-references
- Clichés de SaaS de 2026 (fondos beige/crema exagerados, tipografías manuscritas, espaciados gigantescos improductivos).
- Animaciones distractoras continuas o rebotes infantiles.
- Tarjetas anidadas de forma redundante.
- Iconos emojis en acciones operativas.

## Design Principles
- **Claridad de un vistazo (At-a-glance Legibility)**: Los estatus críticos (SSR, VIP, Alertas NPS) deben leerse instantáneamente en cualquier nivel de zoom o condición de luz ambiental.
- **Eficiencia táctil sin fricción**: Objetos interactivos grandes (mínimo 44x44px) y con retroalimentación clara para evitar errores durante turbulencias o tareas rápidas.
- **Movimiento Coreografiado pero Controlado**: Transiciones fluidas en la navegación y apertura de modales que guíen el foco del tripulante en lugar de distraerlo.
- **Operatividad Confiable**: Mensajes de error claros y estados inactivos coherentes que demuestren estabilidad del sistema.

## Accessibility & Inclusion
- Contraste WCAG AA (mínimo 4.5:1 para textos y 3:1 para elementos de control).
- Compatibilidad completa con el modo de reducción de movimiento del sistema (`prefers-reduced-motion`).
- Foco táctil claro y etiquetas semánticas para lectores de pantalla.

## Operating Context
Aplicación web usada por la tripulación en un tablet o móvil durante el vuelo, con iluminación de cabina variable (luz tenue o resplandor de sol). Los flujos son: elegir vuelo, consultar el mapa de asientos, atender alertas NPS, tomar comandas en Business y revisar estadísticas de pasajeros (SSR, estatus, membresías).

## Capabilities and Constraints
- Angular con Signals; `StoreService` es la única fuente de verdad del estado.
- Hoy todos los datos son de demostración (`mockData.ts`, `aircraftConfigs.ts`); la conexión a una API real es un paso futuro (ver README).
- "Offline-first" es un objetivo del producto, aún no implementado (no hay service worker ni manifest).

## Evidence on Hand
Solo datos mock de vuelos, pasajeros y menús en el repositorio. No hay pasajeros, métricas, testimonios ni casos reales: el trabajo futuro no debe inventarlos.
