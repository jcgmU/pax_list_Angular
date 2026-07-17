# Segunda Opinión: Propuesta de Arquitectura de Avianca SeatMap Pro

> Revisión técnica independiente del documento [PROPUESTA_ARQUITECTURA.md](file:///Users/jcgm/developer/pax-list-angular/PROPUESTA_ARQUITECTURA.md).
> Este análisis no reescribe la propuesta original, sino que evalúa sus fortalezas, identifica debilidades y propone mejoras concretas.

---

## 1. Fortalezas de la Arquitectura Propuesta

### 1.1 Diseño de Tres Fases Operativas (Embarque → Vuelo → Desembarque)
La separación del ciclo de vida del sistema en tres fases claramente delimitadas (tierra pre-vuelo, vuelo offline P2P, y tierra post-vuelo) es **excelente**. Refleja con precisión la realidad operativa de una aerolínea y permite razonar sobre cada fase de forma independiente. Este diseño facilita las pruebas por fase y evita la tentación de mezclar lógica online/offline en un solo flujo indeterminista.

### 1.2 BFF NestJS con Circuit Breaker
La decisión de usar un BFF dedicado en NestJS para aislar la complejidad de los sistemas legacy (Sabre/Amadeus, Salesforce, LifeMiles) es correcta y bien fundamentada. El uso del patrón **Circuit Breaker** con `opossum` y el fallback a manifiestos pre-guardados es una decisión madura que protege la experiencia del tripulante: si DCS falla en tierra, el iPad sigue pudiendo embarcar con datos de contingencia.

### 1.3 Transactional Outbox Pattern
La implementación del patrón Outbox para la re-sincronización en tierra es una de las decisiones más sólidas de la propuesta. Garantiza:
- **Atomicidad local**: la acción del tripulante y el registro en la cola ocurren en una sola transacción.
- **Idempotencia**: el uso de `transactionId` (UUID) previene duplicados al reintentar.
- **Orden causal**: el procesamiento secuencial por `timestamp` preserva la cronología de eventos del vuelo.

### 1.4 Topología de Estrella Dinámica P2P
La elección de centralizar la consolidación del estado en el iPad del Purser como broker principal es acertada. En una cabina de avión, el Jefe de Cabina es la autoridad operativa natural, por lo que alinear la topología de datos con la jerarquía de mando real simplifica tanto la lógica técnica como la comprensión del sistema por parte de los usuarios.

### 1.5 Diagramas Mermaid y Payloads Concretos
La propuesta incluye diagramas de secuencia, diagramas de bloques y ejemplos de payloads JSON reales. Esto es inusual y muy valioso: permite que un equipo de desarrollo comience la implementación sin ambigüedades sobre la estructura de datos esperada.

### 1.6 Seguridad en Capas
El enfoque de defensa en profundidad (SQLCipher en reposo, certificados MPC en tránsito P2P, y SSL Pinning en tierra) cubre los tres vectores de ataque relevantes para un dispositivo corporativo en un entorno público como un aeropuerto o una cabina de avión.

---

## 2. Debilidades Identificadas

### 2.1 ⚠️ RxDB + Capacitor SQLite: Riesgo de Rendimiento en Producción
**Severidad: Alta**

La propuesta selecciona RxDB con el adaptador de Capacitor SQLite como base de datos local. Sin embargo, esta combinación presenta limitaciones significativas en producción:

- **Bridge Overhead (Sobrecarga del puente JS↔Nativo):** En Capacitor, toda comunicación entre la WebView (donde corre Angular/RxDB) y el plugin nativo SQLite requiere serialización JSON bidireccional. Las consultas frecuentes o inserciones unitarias repetitivas (N+1) sufren una penalización severa de rendimiento.
- **Bloqueo del Hilo Principal:** Operaciones pesadas de escritura o recálculo de queries reactivas grandes en RxDB pueden bloquear la UI de Angular si no se agrupan en operaciones bulk.
- **Colecciones Grandes (>5000 docs):** En vuelos de larga distancia con múltiples tramos y manifiestos masivos, las consultas reactivas de RxDB basadas en RxJS consumen memoria y CPU de forma exponencial al recalcular el grafo de observables ante cambios frecuentes.

### 2.2 ⚠️ No Existe Plugin de Capacitor para Multipeer Connectivity
**Severidad: Alta**

La propuesta menciona el uso de Apple Multipeer Connectivity en Capacitor, pero **no existe un plugin oficial ni comunitario mantenido** para esta funcionalidad. Los plugins comunitarios existentes están desactualizados o incompletos. Esto significa que:
- Es **obligatorio desarrollar un plugin nativo de Capacitor en Swift** desde cero.
- El esfuerzo de desarrollo y mantenimiento de este plugin debe considerarse en el roadmap como una tarea de ingeniería significativa (estimación: 3-6 semanas de un desarrollador iOS senior).
- La propuesta no menciona este requisito ni su impacto en el cronograma.

### 2.3 ⚠️ PN-Counter es Insuficiente para el Inventario de Catering
**Severidad: Alta**

La propuesta utiliza un **PN-Counter (Positive-Negative Counter)** para manejar el inventario de comida. Esto es insuficiente por varias razones:

- Un PN-Counter solo acumula un balance numérico global y **no tiene control sobre transacciones individuales** ni invariantes de negocio (como impedir que el stock caiga por debajo de cero durante una desconexión P2P momentánea).
- **No modela la transición de estados** de cada comanda individual (`PENDING` → `SERVED` → `DECLINED`). El inventario de catering no es un simple contador: es un conjunto de órdenes con ciclo de vida propio.
- Si dos tripulantes asignan el último plato al mismo tiempo en zonas desconectadas, un PN-Counter no tiene mecanismo para resolver cuál orden prevalece.

### 2.4 ⚡ Sobreingeniería en la Elección de Líder (Bully Algorithm)
**Severidad: Media**

El **Algoritmo del Matón (Bully Algorithm)** es un protocolo de consenso distribuido diseñado para redes de decenas o cientos de nodos. Aplicarlo a una red de **2 a 4 iPads** en una cabina de avión es sobreingeniería:
- Añade complejidad de red, estados intermedios y depuración innecesarios.
- Los iPads de la tripulación tienen roles operativos fijos (Purser, Auxiliar 1, Auxiliar 2) que se conocen antes del vuelo y no cambian dinámicamente.
- La fase de votación introduce latencia y edge cases (particiones de red, empates) que complican la solución sin beneficio proporcional.

### 2.5 ⚡ Falta de Estrategia de Versionado de Esquemas
**Severidad: Media**

Los esquemas de RxDB están definidos con `version: 0`. La propuesta no describe qué ocurre cuando se necesite modificar un esquema (agregar campos, cambiar enums, etc.) en una actualización de la app. En un entorno MDM donde las actualizaciones se distribuyen a cientos de iPads de forma escalonada, **la migración de esquemas es crítica** y debe planificarse desde el inicio.

### 2.6 ⚡ Ausencia de Estrategia de Monitoreo y Observabilidad
**Severidad: Media**

La propuesta no menciona cómo se monitoreará el sistema en producción:
- ¿Cómo sabe el equipo de operaciones si un iPad no logró sincronizar su Outbox al aterrizar?
- ¿Cómo se detecta un conflicto de CRDT que requirió intervención manual del tripulante?
- ¿Dónde se registran los logs del ciclo de vida P2P para diagnóstico post-vuelo?

### 2.7 💡 Payload de Manifiesto sin Paginación ni Delta Sync
**Severidad: Baja**

El endpoint `GET /api/v1/flights/:flightId/manifest` devuelve el manifiesto completo en una sola respuesta. Para vuelos con 300+ pasajeros y múltiples servicios de catering, este payload podría superar los 500KB. La propuesta no contempla:
- **Delta sync**: descargar solo los cambios desde la última sincronización.
- **Compresión**: uso de `gzip`/`brotli` en el transporte HTTP.
- **Paginación**: para manifiestos excepcionalmente grandes.

---

## 3. Mejoras Propuestas

### 3.1 🔄 Reemplazar RxDB por PowerSync + SQLite Nativo
**Impacto: Alto | Esfuerzo: Medio**

**PowerSync** es una alternativa más madura y optimizada para sincronización offline-first relacional en Angular + Capacitor:
- Sincroniza directamente a nivel de SQLite nativo en segundo plano, **minimizando la sobrecarga del bridge JS↔Nativo**.
- Cuenta con un SDK oficial de Capacitor con soporte robusto para Angular.
- Si el BFF en tierra usa PostgreSQL como almacén de reconciliación, PowerSync se integra nativamente con PostgreSQL para la sincronización bidireccional.
- Mantiene la reactividad necesaria para alimentar Angular Signals sin el overhead de RxJS completo.

> **Alternativa conservadora:** Si se desea mantener RxDB, implementar obligatoriamente operaciones bulk (`bulkInsert`, `bulkUpsert`) y limitar las queries reactivas activas a un máximo de 10 por vista para controlar el consumo de memoria.

### 3.2 📱 Planificar el Plugin Nativo de MPC como Módulo Independiente
**Impacto: Alto | Esfuerzo: Alto**

Dado que no existe un plugin de Capacitor para Multipeer Connectivity, se recomienda:
1. Desarrollar el plugin como un **módulo Swift independiente** publicable en npm (`@avianca/capacitor-multipeer`).
2. Exponer una API mínima desde el lado nativo: `startAdvertising()`, `startBrowsing()`, `sendData()`, `onDataReceived()`, `onPeerStateChanged()`.
3. Toda la lógica de negocio P2P (resolución de conflictos, heartbeats, consolidación de inventario) debe vivir en la capa TypeScript/Angular, no en Swift, para facilitar las pruebas unitarias.
4. Incluir este desarrollo como una **fase dedicada del roadmap** con estimación de 4-6 semanas.

### 3.3 🍽️ Reemplazar PN-Counter por OR-Set de Comandas con Estado
**Impacto: Alto | Esfuerzo: Medio**

En lugar de sincronizar un stock numérico total, se debe sincronizar un conjunto (**OR-Set** o **LWW-Element-Set**) de registros de comandas individuales:

1. Cada comanda es un documento inmutable identificado por asiento (ej: `order-1A`) que transiciona de estado y se replica P2P con resolución **LWW (Last-Write-Wins)** a nivel de atributos.
2. El stock de platos restante se calcula localmente bajo demanda:

   ```
   Stock Disponible = Stock Inicial − Count(Comandas en estado PENDING o SERVED)
   ```

3. **Resolución de conflictos concurrentes:** Si dos tripulantes asignan el último lomo de res al mismo tiempo en zonas desconectadas, al consolidar las comandas la red prioriza la que posea el `timestamp` de creación más antiguo. La comanda perdedora transiciona automáticamente a `DECLINED_CONCURRENT_CONFLICT` y la UI del tripulante afectado le solicita reubicar la orden del pasajero.

### 3.4 🎯 Simplificar la Elección de Líder a Prioridad Estática
**Impacto: Medio | Esfuerzo: Bajo**

Reemplazar el Bully Algorithm por una **tabla de prioridad fija configurada en tierra** antes del vuelo:

| Prioridad | Rol | Comportamiento |
|:---------:|:----|:---------------|
| 1 | iPad del Purser (Jefe de Cabina) | Host por defecto de la sesión MPC |
| 2 | iPad Pasillo Izquierdo (Auxiliar 1) | Primer fallback: asume host si Prioridad 1 no responde en 6s |
| 3 | iPad Pasillo Derecho (Auxiliar 2) | Segundo fallback |

- Cada iPad emite un heartbeat MPC cada 3 segundos.
- Si el iPad con Prioridad 2 detecta la desconexión del host por más de 6 segundos, asume inmediatamente la publicación del servicio P2P **sin fase de votación**.
- Al reconectarse, el Purser reclama el rol de host automáticamente por su prioridad superior.
- Es **determinista, predecible y trivial de probar** en simulaciones.

### 3.5 📊 Agregar Capa de Observabilidad Post-Vuelo
**Impacto: Medio | Esfuerzo: Medio**

Incluir en el Outbox un tipo de transacción `FLIGHT_TELEMETRY` que registre automáticamente:
- Número de conflictos CRDT resueltos durante el vuelo.
- Número de reconexiones P2P y cambios de líder.
- Latencia promedio de la sincronización P2P (tiempo entre envío y ACK).
- Estado final del Outbox al aterrizar (transacciones pendientes vs. completadas).

El BFF debe exponer un endpoint `/api/v1/telemetry/flight-report` que consolide estos datos en un dashboard operativo para el equipo de TI de Avianca.

### 3.6 📋 Definir Estrategia de Migración de Esquemas
**Impacto: Medio | Esfuerzo: Bajo**

Documentar desde el inicio:
- **Migraciones incrementales** para cada cambio de esquema (RxDB soporta `migrationStrategies` por versión; PowerSync usa migraciones SQL estándar).
- **Compatibilidad hacia atrás** durante el período de despliegue escalonado MDM: dos iPads en el mismo avión podrían tener versiones diferentes de la app durante 24-48h.
- **Pruebas de migración** como parte del pipeline de CI/CD antes de cada release.

### 3.7 📦 Agregar Compresión y Delta Sync al Manifiesto
**Impacto: Bajo | Esfuerzo: Bajo**

- Habilitar compresión `gzip`/`brotli` en el BFF NestJS (middleware de compresión estándar).
- Agregar un header `If-Modified-Since` o un campo `lastSyncVersion` al endpoint del manifiesto para soportar descargas incrementales.
- Para vuelos con conexiones (tramos múltiples), permitir que el iPad descargue solo el delta del siguiente tramo.

---

## 4. Resumen Ejecutivo

| Categoría | Elemento | Veredicto |
|:----------|:---------|:----------|
| **Fortaleza** | Diseño de 3 fases operativas | ✅ Excelente |
| **Fortaleza** | BFF NestJS + Circuit Breaker | ✅ Sólido |
| **Fortaleza** | Transactional Outbox Pattern | ✅ Sólido |
| **Fortaleza** | Topología de Estrella (Purser como broker) | ✅ Acertado |
| **Fortaleza** | Seguridad en capas (SQLCipher + MPC certs + SSL Pin) | ✅ Completo |
| **Debilidad** | RxDB + Capacitor SQLite (rendimiento bridge) | ⚠️ Riesgo Alto |
| **Debilidad** | No existe plugin de Capacitor para MPC | ⚠️ Riesgo Alto |
| **Debilidad** | PN-Counter insuficiente para catering | ⚠️ Riesgo Alto |
| **Debilidad** | Bully Algorithm para 2-4 nodos | ⚡ Sobreingeniería |
| **Debilidad** | Sin estrategia de migración de esquemas | ⚡ Riesgo Medio |
| **Debilidad** | Sin observabilidad post-vuelo | ⚡ Riesgo Medio |
| **Mejora** | Evaluar PowerSync como alternativa a RxDB | 🔄 Recomendado |
| **Mejora** | Plugin MPC nativo como módulo independiente | 📱 Necesario |
| **Mejora** | OR-Set de comandas en lugar de PN-Counter | 🍽️ Recomendado |
| **Mejora** | Prioridad estática en vez de Bully Algorithm | 🎯 Recomendado |
| **Mejora** | Telemetría de vuelo en el Outbox | 📊 Deseable |

---

> **Veredicto General:** La propuesta de arquitectura tiene una base conceptual **muy sólida** y demuestra un entendimiento profundo del dominio operativo de aviación. Las tres debilidades de alta severidad (RxDB en producción, ausencia de plugin MPC y el modelo de CRDT para catering) son corregibles sin rediseñar la arquitectura general. Las mejoras propuestas refinan la implementación sin alterar la visión del sistema.
