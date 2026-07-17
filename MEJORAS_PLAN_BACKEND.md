# Mejoras al Plan de Backend — Avianca SeatMap Pro (v3)

> Tercera iteración del diseño. Revisa [`PROPUESTA_ARQUITECTURA.md`](./PROPUESTA_ARQUITECTURA.md) (v2) y [`DECISIONES_ARQUITECTURA.md`](./DECISIONES_ARQUITECTURA.md) con foco exclusivo en el **backend y la plataforma**: identifica huecos que ningún documento anterior cubre, resuelve contradicciones internas del plan actual y añade las piezas de estudio necesarias antes de programar.
> **Fecha:** 2026-07-17 · **Estado:** propuesta de diseño, sin implementación.

---

## Índice de hallazgos

| # | Hallazgo | Tipo | Severidad |
|:--|:---------|:-----|:---------:|
| H1 | No existe diseño de autenticación/autorización (crew, dispositivos, portal) | Hueco | 🔴 Crítica |
| H2 | PowerSync y el Transactional Outbox son dos motores de sincronización que se pisan entre sí | Contradicción | 🔴 Crítica |
| H3 | LWW depende de relojes de dispositivos que estarán 10+ horas sin NTP | Riesgo técnico | 🔴 Crítica |
| H4 | La idempotencia por `transactionId` no deduplica órdenes replicadas por P2P entre iPads | Riesgo técnico | 🔴 Crítica |
| H5 | No existe modelo de datos del lado servidor (PostgreSQL) | Hueco | 🟠 Alta |
| H6 | El Delta Sync no contempla borrados (tombstones) ni define cómo se calcula `syncVersion` | Hueco | 🟠 Alta |
| H7 | PII y datos sensibles (SSR médicos) sin política de retención ni marco legal | Hueco | 🟠 Alta |
| H8 | El contrato de `/sync/reconcile` es todo-o-nada; falta respuesta parcial y dead-letter | Diseño API | 🟠 Alta |
| H9 | No hay flujo de "inicio de vuelo": cómo un iPad sabe su vuelo, su rol y su prioridad P2P | Hueco | 🟠 Alta |
| H10 | Infraestructura, despliegue y DR del BFF no aparecen en ningún documento ni en el roadmap | Hueco | 🟠 Alta |
| H11 | La integración con Amadeus Altéa probablemente no es REST: PNL/ADL vía SITA es lo habitual | Estudio | 🟡 Media |
| H12 | Telemetría llega por dos caminos distintos (reconcile + endpoint dedicado) | Contradicción | 🟡 Media |
| H13 | Observabilidad del lado servidor sin definir (la telemetría cubre solo el cliente) | Hueco | 🟡 Media |
| H14 | Sin contrato formal de API (OpenAPI), sin formato de errores, sin estrategia de versionado | Diseño API | 🟡 Media |
| H15 | Esquema local sin `flight_id`: rompe la operación multi-tramo del mismo día | Diseño datos | 🟡 Media |
| H16 | Rotación de certificados de SSL Pinning puede dejar la flota de iPads inservible | Riesgo operativo | 🟡 Media |

---

## H1 — Autenticación y Autorización (el hueco más grande del plan)

Ningún documento define cómo se autentica nada. Hay al menos **cuatro identidades** distintas que el backend debe manejar:

| Identidad | Quién es | Necesita |
|:----------|:---------|:---------|
| **Tripulante** | Persona con rol (Purser / Auxiliar) | Login, rol por vuelo, trazabilidad de acciones (`crewMemberId` ya aparece en los payloads pero nadie lo emite) |
| **Dispositivo** | iPad corporativo enrolado en MDM | Identidad de máquina para que el BFF rechace clientes no corporativos |
| **Personal de catering** | Usuario del portal web | Login administrativo con rol de escritura |
| **Equipo de TI** | Usuario del dashboard de telemetría | Login administrativo de solo lectura |

### Decisión propuesta

1. **Identidad de dispositivo → mTLS con certificados de MDM.** El enrolamiento MDM ya distribuye certificados (el plan los usa para MPC). Reutilizarlos para TLS mutuo contra el BFF: ningún request llega siquiera a la capa de aplicación si no viene de un iPad corporativo. Es la capa que falta entre "TLS 1.3 + pinning" y "endpoints abiertos".
2. **Identidad de tripulante → OIDC contra el IdP corporativo de Avianca** (Entra ID / AD FS, confirmar con TI). El tripulante hace login **en tierra, antes del vuelo**, durante la ventana de conectividad.
3. **El problema del token offline:** un vuelo BOG–MAD dura ~10 h sin red; un access token estándar (15–60 min) expira en el aire. Diseño:
   - Access token de corta vida para hablar con el BFF (solo se usa en tierra: descarga y reconcile).
   - **Sesión de vuelo local firmada:** al descargar el manifiesto, el BFF emite un "flight session token" (JWT firmado, `exp` = hora estimada de llegada + margen de 6 h, claims: `crewMemberId`, `role`, `flightId`, `deviceId`). La app lo valida offline con la clave pública embebida. En el reconcile post-vuelo el iPad se re-autentica normalmente (refresh token con `offline_access`, o re-login si expiró).
   - Cada transacción del Outbox y cada mensaje P2P lleva el `crewMemberId` de la sesión → auditoría completa sin depender de red.
4. **Portal de catering y dashboard → SSO corporativo con RBAC simple:** `CATERING_EDITOR` (escritura de menús), `OPS_VIEWER` (telemetría), `ADMIN`.

> **Acción pendiente nueva (A6):** confirmar IdP corporativo y si los certificados MDM sirven para mTLS de aplicación (SCEP/ACME del MDM).

---

## H2 — Resolver la contradicción PowerSync vs. Transactional Outbox

El plan v2 adopta **PowerSync** (motor de sincronización bidireccional continua con PostgreSQL) **y a la vez** diseña un Outbox manual con endpoint `POST /sync/reconcile` propio. Son dos motores de sincronización para el mismo dato:

- PowerSync ya trae su propia cola de subida (upload queue) y su propio protocolo de bajada desde Postgres (sync rules sobre el WAL). Si se usa de verdad, el Outbox manual y el endpoint reconcile sobran.
- Si se mantiene el Outbox manual (que está bien diseñado y es la pieza más elogiada del plan), PowerSync queda reducido a "SQLite con extras", pagando a cambio: un **servicio PowerSync adicional que operar** (self-hosted u hosted, con licencia), acoplamiento del esquema local a las sync rules, y una incógnita de compatibilidad con SQLCipher.

Además, el patrón de datos de este sistema **no es sincronización continua**: es *descarga por lotes al inicio + operación 100 % local + subida por lotes al final*. Ese patrón no aprovecha lo que PowerSync hace bien.

### Decisión propuesta

**Retirar PowerSync. Usar SQLite nativo directo** (`@capacitor-community/sqlite` con SQLCipher, u OP-SQLite) **+ el Delta Sync y el Outbox ya diseñados.**

- Se conserva la razón por la que se descartó RxDB (evitar el overhead del bridge y los observables): las consultas van directo a SQLite nativo y la reactividad se resuelve en el `StoreService` con Signals, que ya existe.
- Se elimina una pieza de infraestructura completa (el PowerSync Service), su licencia y su curva de aprendizaje.
- El esquema SQL, las migraciones y la vista `catering_stock_available` del plan v2 se mantienen intactos.

> **Alternativa** (si el equipo valora el respaldo enterprise de PowerSync): adoptarlo **completo** — eliminar el Outbox manual, implementar la lógica de reconcile dentro del upload handler del conector, y presupuestar el servicio en infraestructura. Lo indefendible es la posición actual: ambos a medias.

---

## H3 — Relojes: LWW no puede depender del reloj de pared

La resolución de conflictos (comanda con "timestamp más antiguo gana") asume relojes comparables entre iPads. Pero los iPads pasan 10+ horas sin NTP; un deriva de segundos es realista y un reloj mal configurado (zona horaria, ajuste manual) rompe el algoritmo silenciosamente: el "ganador" del último plato lo decidiría el iPad con el reloj atrasado.

### Decisión propuesta

1. **Hybrid Logical Clock (HLC)** en la capa TypeScript: cada evento lleva `(physicalTime, logicalCounter, deviceId)`. Los HLC se actualizan con cada mensaje P2P recibido, garantizando orden causal aunque los relojes deriven. Es un algoritmo pequeño (~50 líneas) y determinista de probar.
2. **Desempate total y determinista:** si dos HLC empatan, gana el `deviceId` menor. Nunca hay empates irresolubles y los tres iPads llegan a la misma conclusión sin coordinarse.
3. **Chequeo de sanidad en tierra:** al descargar el manifiesto, el BFF devuelve su hora; si el desfase del iPad supera un umbral (p. ej. 30 s), la app lo registra en telemetría y muestra advertencia al tripulante.
4. Los `timestamp` ISO se conservan en payloads para lectura humana y para el servidor, pero **el orden lo dictan los HLC**, no el reloj de pared.

---

## H4 — Deduplicación entre dispositivos: la idempotencia actual no alcanza

El diseño v2 deduplica por `transactionId` (UUID generado por el iPad que crea la transacción). Pero hay un caso que se le escapa:

> La comanda del pasajero 3A se registra en el iPad Aux 1, se replica por P2P al Purser y al Aux 2. **Los tres iPads aterrizan y los tres suben su Outbox.** Si cada uno registró la comanda replicada como transacción propia, el servidor recibe tres transacciones con tres UUIDs distintos que describen **el mismo hecho de negocio**.

### Decisión propuesta

1. **Idempotencia en dos niveles:**
   - **Nivel transporte** (`transactionId`): evita reprocesar el mismo envío ante reintentos HTTP. Ya está diseñado, se conserva.
   - **Nivel entidad** (`entityId`): cada hecho de negocio tiene un ID único global generado por el dispositivo *origen* (`order-{flightId}-{seatId}-{uuid}` para comandas, `nps-{incidentId}` para recuperaciones). El servidor hace upsert por `entityId` aplicando la misma resolución HLC/LWW que la cabina: recibir la misma comanda tres veces converge al mismo registro.
2. **Regla en el cliente:** los eventos recibidos por P2P **se aplican a las tablas locales pero no generan entradas nuevas en el Outbox** — cada iPad sube solo lo que originó. La subida triple queda entonces como red de seguridad (si el iPad origen muere, sus datos viajan igual en las réplicas), no como caso normal.
3. El servidor persiste `origin_device_id` y el HLC del evento para poder auditar qué iPad originó cada hecho.

---

## H5 — Modelo de datos del servidor (PostgreSQL)

El plan detalla el esquema local del iPad pero del lado servidor solo existe la tabla de caché de manifiestos (Q2). Falta el modelo que hace posible la reconciliación, la idempotencia, el delta sync y la telemetría. Diseño propuesto (conceptual, afinar en implementación):

```
flights                    -- vuelo operativo: flight_id, date, ruta, aircraft, estado (SCHEDULED/DEPARTED/RECONCILED)
flight_manifest_cache      -- (ya definida en Q2) payload JSONB + sync_version
manifest_changes           -- log de cambios por vuelo para delta sync: (flight_id, sync_version, entity_type,
                           --   entity_id, operation UPSERT|DELETE, payload) → ver H6
catering_menus             -- (ya definida en Q5, portal de catering)
processed_transactions     -- idempotencia de transporte: (transaction_id PK, device_id, received_at, result)
                           --   con política de purga (p. ej. 90 días)
meal_orders                -- estado final consolidado por entityId: upsert con resolución HLC (ver H4)
nps_recoveries             -- recuperaciones NPS: fuente de verdad propia (D3), con estado de
                           --   integración Salesforce: PENDING_CRM / SENT / FAILED / NOT_CONFIGURED
flight_telemetry           -- métricas P2P por vuelo y dispositivo
sync_dead_letter           -- transacciones que fallaron validación o superaron reintentos (ver H8)
audit_log                  -- quién (crew/portal user) hizo qué y cuándo — requisito de cumplimiento (H7)
```

Decisiones asociadas:

- **`nps_recoveries` con máquina de estados de integración** materializa la Fase 2 de Salesforce (D3): cuando exista el endpoint del CRM, un worker recorre los `PENDING_CRM` — no cambia el contrato del iPad ni el esquema.
- **Migraciones del servidor** con herramienta estándar (Prisma Migrate / TypeORM migrations / Flyway) bajo la misma disciplina aditiva ya definida para el cliente.
- **Backups y retención** definidos junto con H7 (no "para siempre por defecto").

---

## H6 — Delta Sync completo: versionado y tombstones

El plan dice "el BFF responde solo con los registros modificados desde `lastSyncVersion`" pero no define cómo se produce esa versión ni qué pasa con los **borrados**. Caso real: un pasajero hace no-show o es desembarcado después de que el Purser ya descargó la versión 41 — un delta que solo trae upserts jamás lo eliminará del iPad.

### Decisión propuesta

1. **`sync_version` es un contador monotónico por vuelo**, incrementado por el BFF cada vez que el agregador detecta un cambio contra el snapshot cacheado (diff por entidad al refrescar desde los sistemas legacy).
2. Cada cambio se registra en `manifest_changes` con `operation: UPSERT | DELETE`. El delta para un cliente en versión N es la lista compactada de cambios con `sync_version > N` (una sola entrada final por entidad).
3. La respuesta delta incluye `deletions: { passengers: [ids], seats: [ids] }` y el iPad las aplica antes que los upserts.
4. **Escape hatch:** si `lastSyncVersion` es demasiado viejo (el vuelo se recacheó desde cero) el BFF responde `410 Gone` y el iPad hace descarga completa. Evita mantener historial de cambios infinito.

---

## H7 — PII, datos sensibles y cumplimiento

El manifiesto contiene nombres, números de viajero frecuente, historial de quejas y **SSR que son datos de salud** (WCHR/WCHS/WCHC, POC, dietas médicas) y situaciones legales (deportados). Ningún documento trata el marco legal, y el sistema opera bajo al menos dos regímenes:

- **Colombia:** Ley 1581/2012 (Habeas Data) — los datos de salud son *datos sensibles* con régimen reforzado.
- **Unión Europea:** la ruta piloto es BOG–**MAD** → aplica **GDPR** (art. 9 para categorías especiales).

### Decisiones propuestas

1. **Minimización:** el BFF filtra el manifiesto a lo estrictamente operativo (ya está implícito en Q7: sin fotos; hacerlo explícito como principio: si la cabina no lo necesita para actuar, no viaja al iPad).
2. **Retención en el iPad:** los datos del vuelo se **purgan automáticamente al completar el reconcile** (o a las 24 h del aterrizaje como tope, incluso sin reconcile exitoso — con el Outbox como única excepción hasta vaciarse). Esto además resuelve la acumulación multi-tramo (H15).
3. **Retención en el servidor:** definir con Legal la ventana por tabla (propuesta inicial: manifiestos cacheados 7 días, comandas/NPS 2 años agregados, `audit_log` según política corporativa). Documentar antes del piloto.
4. **Auditoría de acceso:** toda consulta de manifiesto y toda acción de escritura queda en `audit_log` con `crewMemberId`/usuario de portal (posible gracias a H1).
5. **Registro de tratamiento y DPIA/PIA** antes del piloto BOG–MAD — es una tarea de proyecto, no solo técnica. Añadida al roadmap.

> **Acción pendiente nueva (A7):** sesión con Legal/DPO de Avianca: bases legales, retención y evaluación de impacto para la ruta europea.

---

## H8 — Contrato de `/sync/reconcile`: éxito parcial y dead-letter

En el diseño v2 el iPad marca `synced=1` para todo el lote si recibe `200 OK`. Problemas: una transacción malformada envenena el lote completo (o peor, se marca como sincronizada sin haberse procesado), y no hay política terminal para transacciones que nunca van a pasar.

### Decisión propuesta

1. **Respuesta por transacción:**

```json
{
  "results": [
    { "transactionId": "tx-1", "status": "PROCESSED" },
    { "transactionId": "tx-2", "status": "DUPLICATE" },
    { "transactionId": "tx-3", "status": "REJECTED", "reason": "UNKNOWN_MEAL_ID", "retryable": false },
    { "transactionId": "tx-4", "status": "FAILED", "reason": "CRM_TIMEOUT", "retryable": true }
  ]
}
```

2. El iPad marca `synced=1` solo para `PROCESSED`/`DUPLICATE`; incrementa `retry_count` para `retryable: true`; y para `retryable: false` la marca como `dead` local (nuevo estado en `sync_outbox`) y la reporta en telemetría — nunca la reintenta infinitamente.
3. **Backoff exponencial con jitter** entre reintentos y un **lock de proceso** para que el listener de red no dispare dos envíos concurrentes del mismo lote (el diseño actual puede hacerlo si la conectividad parpadea).
4. Del lado servidor, todo `REJECTED` se persiste en `sync_dead_letter` con el payload completo: nada que un tripulante hizo en vuelo se pierde en silencio; operaciones lo revisa desde el dashboard.
5. Las transacciones dentro del lote se procesan **en orden HLC**, y cada una en su propia transacción de base de datos.

---

## H9 — Flujo de inicio de vuelo (device ↔ vuelo ↔ rol ↔ prioridad)

La tabla de prioridad P2P "se configura en tierra antes del vuelo", pero nadie define cómo. Falta el flujo completo de arranque, que además alimenta la autenticación (H1) y la sesión de vuelo:

### Diseño propuesto

1. Tripulante hace login (OIDC) en el iPad → el BFF consulta **Crew Rostering** (fuente ya identificada en `resumen.txt` pero ausente del plan v2: nuevo adapter) y devuelve los vuelos asignados al tripulante hoy.
2. El tripulante confirma vuelo y rol (Purser / Aux 1 / Aux 2); si Rostering no está disponible, selección manual con código de vuelo (fallback degradado).
3. El BFF emite el **flight session token** (H1) con `flightId`, `role` y `p2pPriority` derivada del rol. La prioridad P2P deja de ser un archivo de configuración: **viene firmada en la sesión**.
4. Con la sesión activa se dispara la descarga del manifiesto. Un iPad sin sesión de vuelo no participa de la red P2P (los peers validan el claim del token en el handshake MPC).

Nuevo endpoint: `GET /api/v1/crew/me/flights` + `POST /api/v1/flights/:flightId/session`.

> **Acción pendiente nueva (A8):** confirmar sistema de Crew Rostering y su API (¿AIMS, Sabre CrewTrac, in-house?).

---

## H10 — Infraestructura, despliegue y DR del BFF

El roadmap salta de "BFF NestJS + PostgreSQL (3 semanas)" al piloto sin que exista dónde ni cómo corre. Mínimos a decidir y presupuestar:

| Área | Propuesta inicial |
|:-----|:------------------|
| **Runtime** | Contenedores (el BFF es stateless → réplicas simples detrás de un LB). Cloud corporativa de Avianca o el proveedor que dicte TI — decidir en A9 |
| **Entornos** | `dev` → `staging` (con mocks de Amadeus/Salesforce) → `prod`. Staging es obligatorio: es donde corren las pruebas de contrato contra sandboxes de los legacy |
| **PostgreSQL** | Gestionado (RDS/Cloud SQL/equivalente corporativo) con backups automáticos + PITR. RPO ≤ 15 min, RTO ≤ 4 h como punto de partida |
| **Secretos** | Vault/Secrets Manager corporativo. Nunca `process.env` plano con tokens de Amadeus en texto (el snippet v2 lo hace; corregir al implementar) |
| **CI/CD** | GitHub Actions: lint + tests + pruebas de contrato + pruebas de migración (las del cliente ya previstas en v2 **y las del servidor**, H5) |
| **Modo degradado** | El sistema ya tolera BFF caído (los iPads vuelan solos y el Outbox reintenta) — documentarlo como decisión de disponibilidad: el BFF **no** necesita HA extrema; necesita **no perder datos** (backups + dead-letter). Eso abarata la infraestructura |
| **Rate limiting / WAF** | Rate limit por certificado de dispositivo en el BFF; WAF delante del portal de catering (es el único componente expuesto a browsers) |

> **Acción pendiente nueva (A9):** definir con TI la plataforma de despliegue corporativa y requisitos de red (¿el BFF debe vivir en la red interna con acceso saliente a Amadeus/Salesforce?).

---

## H11 — Estudio: la integración con Amadeus probablemente no es REST

El plan asume "API de Amadeus con Bearer token" (snippet v2). En la práctica de la industria:

- Altéa expone servicios **SOAP/XML propietarios** bajo contrato (Amadeus Web Services), no la API pública REST de developers.amadeus.com (que es para búsqueda/booking, no para DCS operacional).
- Muchísimas aerolíneas reciben el manifiesto como mensajes **PNL/ADL (teletipo IATA vía SITA)** y datos de cierre como **PFS/ETL**. Si es el caso de Avianca, el adapter no es un cliente HTTP: es un **parser de mensajes teletipo + un buzón SITA (MQ o similar)**, con un modelo *push* (los ADL llegan cuando llegan) en lugar de *pull*.

**Impacto si se confirma PNL/ADL:** el `ManifestAggregatorService` cambia de "3 llamadas paralelas" a "2 llamadas + 1 proyección de mensajes ya recibidos"; aparece un componente nuevo (ingestor de mensajería) y el delta sync (H6) se alimenta naturalmente de los ADL (cada ADL *es* un delta). El diseño de caché de Q2 sobrevive intacto.

> Esto refuerza A1 como **la** acción bloqueante número uno. La estimación "3 semanas de BFF" no es creíble hasta responderla. Recomendación: diseñar el puerto del adapter (interfaz `ManifestSource`) de forma agnóstica desde el día 1 y construir primero contra un mock, para que la respuesta de A1 no bloquee el resto del backend.

---

## H12 — Un solo camino para la telemetría

v2 define `FLIGHT_TELEMETRY` como transacción del Outbox **y además** el endpoint `POST /api/v1/telemetry/flight-report`. Dos rutas de entrada para el mismo dato = doble validación, doble idempotencia y ambigüedad para el cliente.

**Decisión:** la telemetría viaja **solo como transacción del Outbox** (ya tiene idempotencia, reintentos y orden gratis). `GET /api/v1/telemetry/...` queda como API **de lectura** para el dashboard. Se elimina el POST dedicado.

---

## H13 — Observabilidad del servidor

La telemetría de vuelo cubre la cabina; el BFF necesita la suya:

- **Logs estructurados** (JSON) con `flightId` y `deviceId` como campos de correlación en todo el pipeline de reconcile.
- **Métricas** (OpenTelemetry → Prometheus/Grafana o el stack corporativo): estado de los circuit breakers por adapter, latencia y tasa de error por sistema legacy, profundidad de `sync_dead_letter`, vuelos con reconcile incompleto tras N horas del aterrizaje.
- **Alertas mínimas del piloto:** (1) circuit breaker de Amadeus abierto > 10 min en ventana de embarque, (2) vuelo aterrizado sin reconcile de ningún iPad tras 2 h, (3) crecimiento de dead-letter.
- El **dashboard operativo** ya previsto se alimenta de estas métricas + `flight_telemetry`: una sola vista "salud del vuelo" (¿sincronizaron los 3 iPads? ¿cuántos conflictos? ¿algo en dead-letter?).

---

## H14 — Formalización del contrato de API

- **OpenAPI 3.1 como fuente de verdad** del contrato BFF ↔ iPad y BFF ↔ portal, versionada en el repo. De ahí se generan los tipos TypeScript de ambos lados (evita la deriva cliente/servidor que hoy ya asoma: el esquema local usa `DECLINED_CONCURRENT_CONFLICT`, los payloads de ejemplo no).
- **Errores en formato RFC 9457 (`application/problem+json`)** con códigos de error de negocio estables (`UNKNOWN_MEAL_ID`, `STALE_SYNC_VERSION`, …) — son los mismos `reason` de H8.
- **Versionado:** `/api/v1` en la ruta + `schemaVersion` en el cuerpo (ya previsto) para la adaptación por versión de app. Regla escrita: v1 nunca rompe compatibilidad; los campos nuevos son opcionales.
- **Corrección al contrato actual:** `SEAT_CHANGE` existe como tipo de Outbox pero ningún endpoint define su semántica del lado servidor. Aclarar que es **informativo** (se persiste para análisis; no se escribe de vuelta al DCS — el DCS no acepta cambios post-vuelo) o eliminarlo del alcance v1.

---

## H15 — `flight_id` en el esquema local y ciclo de vida multi-tramo

Las tablas locales (`passengers`, `meal_orders`, `sync_outbox`) no tienen `flight_id`. Una tripulación de corto radio (A320) opera 4–6 tramos/día: sin esa columna, el tramo 2 pisa o se mezcla con el tramo 1, y el Outbox no puede atribuir transacciones pendientes al vuelo correcto.

**Decisión:** añadir `flight_id` (+ `flight_date`) a todas las tablas operativas locales y al payload de toda transacción del Outbox. La purga de H7 opera por vuelo: cerrar sesión de vuelo → reconcile → purga de ese `flight_id`. El Outbox pendiente de tramos anteriores sobrevive hasta vaciarse aunque ya se esté operando el siguiente tramo.

---

## H16 — SSL Pinning sin riesgo de brickear la flota

Pinning estático mal gestionado + certificado rotado = toda la flota sin conectividad hasta pasar por MDM. Reglas:

1. Pinear **la clave pública de la CA intermedia propia**, no el certificado hoja.
2. **Siempre dos pines** (activo + backup) embebidos; rotación en dos releases (añadir pin nuevo → rotar cert → retirar pin viejo).
3. Kill-switch vía MDM managed app config para desactivar pinning en emergencia (el canal MDM es en sí un canal autenticado).

---

## Impacto en el roadmap

Cambios sobre el Gantt de v2 (las duraciones de P2P/cliente no cambian):

| Cambio | Detalle |
|:-------|:--------|
| ➕ **Fase 0 (1–2 sem, antes de Fase 1)** | Descubrimiento bloqueante: A1 (Amadeus/PNL-ADL), A6 (IdP + mTLS), A8 (Rostering), A9 (plataforma de despliegue), A7 (sesión Legal/DPO). En paralelo: OpenAPI v1 draft + interfaz `ManifestSource` con mock |
| ✏️ **Fase 1 ampliada** | "BFF NestJS + PostgreSQL" pasa de 3 a **4–5 sem**: se añade auth (H1), modelo de datos servidor (H5), delta sync con tombstones (H6), reconcile parcial + dead-letter (H8), flujo de inicio de vuelo (H9) |
| ➖ **PowerSync eliminado** | "PowerSync: integración Angular (2 sem)" se reemplaza por "Capa SQLite nativa + acceso a datos (1–1.5 sem)" — devuelve casi el tiempo que la Fase 1 crece |
| ➕ **Infra transversal (paralela a Fase 1)** | Entornos, CI/CD, secretos, observabilidad servidor (H10, H13): 2 sem de un perfil DevOps |
| ➕ **Gate de cumplimiento antes del piloto** | DPIA + retención aprobada por Legal (H7). Sin esto no hay piloto con datos reales en ruta europea |
| ✏️ **HLC dentro del CRDT Engine** | Sin cambio de duración; cambia el contenido: los HLC (H3) sustituyen la comparación de timestamps y son lo primero que se prueba |

**Neto estimado:** +3 a +4 semanas hasta el piloto, la mayoría en descubrimiento y autenticación — trabajo que de todos modos habría aparecido, pero en medio de la implementación y con rediseños.

---

## Registro consolidado de acciones pendientes (actualiza la tabla de DECISIONES)

| # | Acción | Bloquea | Origen |
|:--|:-------|:--------|:-------|
| A1 | Confirmar proveedor DCS real **y modalidad de integración (API vs PNL/ADL-SITA)** | Adapter de manifiesto, estimación Fase 1 | v2 + H11 |
| A2 | Verificar contrato Bulk API con el GDS | Estrategia de caché | v2 |
| A3 | Definir proceso de cierre de casos NPS en Salesforce | Worker Fase 2 (`nps_recoveries`) | v2 |
| A4 | Confirmar client isolation en Wi-Fi del A320 | Estrategia sync A320 | v2 |
| A5 | Confirmar access point B787 para tripulación | Plugin MPC B787 | v2 |
| **A6** | Confirmar IdP corporativo (Entra ID / otro) y viabilidad de mTLS con certificados MDM | Todo H1 | Nueva |
| **A7** | Sesión Legal/DPO: bases legales, retención, DPIA ruta BOG–MAD | Piloto con datos reales | Nueva |
| **A8** | Identificar sistema de Crew Rostering y su API | Flujo de inicio de vuelo (H9) | Nueva |
| **A9** | Definir plataforma de despliegue y topología de red del BFF | Infra (H10) | Nueva |

---

> **Veredicto:** la base del plan v2 (tres fases, BFF con circuit breakers, Outbox, OR-Set + prioridad estática) sigue siendo correcta y no se toca. Lo que esta revisión añade es la mitad del sistema que los documentos anteriores daban por sentada: identidad, contratos formales, el modelo de datos del servidor, el ciclo de vida del dato (versiones, borrados, purga, cumplimiento) y la plataforma donde todo corre. Con H1–H4 resueltos antes de escribir código, el resto del plan se puede ejecutar tal como está escrito.
