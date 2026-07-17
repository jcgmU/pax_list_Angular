# Decisiones de Arquitectura — Avianca SeatMap Pro

> Documento que resuelve las 7 preguntas del archivo [`preguntas.txt`](./preguntas.txt) con suposiciones técnicas razonables y las decisiones de arquitectura que implica cada respuesta.
> **Fecha de resolución:** 2026-07-17

---

## Q1 — Sistemas Legacy (DCS, SSR y Lealtad)

**Pregunta:** ¿Qué sistemas nos proveen el Manifiesto Final, los SSR y los perfiles de lealtad?

**Suposición adoptada:**
- **DCS + SSR:** Amadeus Altéa (PSS principal, estándar en aerolíneas latinoamericanas de gran tamaño). Cubre check-in, boarding, manifiesto de pasajeros y SSR en una sola plataforma.
- **Lealtad:** LifeMiles tiene su propia API/CRM independiente (es un joint venture separado de Avianca).
- **NPS:** Salesforce Service Cloud.

> **Estado:** Suposición — confirmar proveedor real con equipo de TI.

**Decisión de arquitectura:**
- El BFF necesita hablar **3 "idiomas"** distintos → se implementa una capa de mapeo/transformación (adapters pattern) por cada sistema
- Se crea un `ManifestAggregatorService` en NestJS que orquesta las 3 llamadas en paralelo (`Promise.all`) y consolida el resultado en el payload unificado del iPad
- Cada adapter tiene su propio Circuit Breaker independiente con fallback graceful:
  - Falla Amadeus → `FALLBACK_MODE`, iPad funciona con último manifiesto cacheado
  - Falla LifeMiles → pasajero se muestra como tier `REGULAR`
  - Falla Salesforce → pasajero se muestra sin alerta NPS activa

```
BFF NestJS
├── adapters/
│   ├── amadeus.adapter.ts     ← DCS + SSR
│   ├── lifemiles.adapter.ts   ← Tier Diamond/Gold/Silver
│   └── salesforce.adapter.ts  ← NPS alerts
└── services/
    └── manifest-aggregator.service.ts
```

---

## Q2 — Rate Limits y Bulk API

**Pregunta:** ¿Las APIs legacy permiten consultas masivas o hay restricciones de rate-limit?

**Suposición adoptada:** Los sistemas GDS legacy (Amadeus/Sabre) tienen **rate limits severos** y cobran por transacción. No se asume disponibilidad de Bulk API.

> **Estado:** Suposición defensiva — verificar con equipo de TI si existe contrato que incluya Bulk.

**Decisión de arquitectura:**
- El BFF implementa **caché de manifiestos por vuelo en PostgreSQL**
- **Clave de caché:** `{ flightId, flightDate }` — 1 sola llamada a sistemas legacy por vuelo
- El primer iPad que descarga el manifiesto (generalmente el Purser) llena la caché
- Todos los demás iPads del mismo vuelo leen de PostgreSQL, no de Amadeus
- **TTL de caché:** 30 minutos antes del cierre de puerta; invalidada automáticamente al recibir señal de `DOOR_CLOSED` (si hay webhook) o manual por el Purser
- Política: si el manifiesto en caché tiene más de 2 horas, se fuerza refresco

```sql
-- tabla de caché en PostgreSQL
CREATE TABLE flight_manifest_cache (
  flight_id       TEXT NOT NULL,
  flight_date     DATE NOT NULL,
  payload         JSONB NOT NULL,
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_version    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (flight_id, flight_date)
);
```

---

## Q3 — API Consolidada LifeMiles + NPS

**Pregunta:** ¿Hay una API única para consultar LifeMiles + NPS de un pasajero?

**Suposición adoptada:** **No existe** una API todo-en-uno. Son sistemas completamente separados con sus propias APIs.

> **Estado:** Suposición — confirmar si LifeMiles expone API directa o si hay intermediario interno.

**Decisión de arquitectura:**
- El `ManifestAggregatorService` hace **3 llamadas en paralelo** por vuelo (no por pasajero)
- Se enriquece el payload completo antes de cachearlo en PostgreSQL → el iPad nunca espera consultas individuales
- Esto ya estaba cubierto en `PROPUESTA_ARQUITECTURA.md` → **ningún cambio estructural**, solo confirmación del diseño

---

## Q4 — Destino de la Resolución NPS

**Pregunta:** Cuando la tripulación marca "Atención Ofrecida", ¿a qué sistema va?

**Respuesta real:** **No se sabe aún** — es posible que ese endpoint receptor todavía no exista en los sistemas de la aerolínea.

**Decisión de arquitectura:**
- Se construyen **ambas partes**:
  1. **App (iPad):** la acción de "Atención Ofrecida" escribe en el Outbox local como `NPS_RECOVERY` con `incidentId + crewMemberId + resolvedAt`
  2. **BFF:** el endpoint `POST /api/v1/sync/reconcile` procesa el Outbox y **guarda el registro en PostgreSQL** como fuente de verdad propia
  3. **Integración Salesforce (fase 2):** cuando se confirme el endpoint/proceso de Salesforce, el BFF añade el paso de notificación. Por ahora, el registro queda en nuestra propia BD
- **Diseño preparado para el futuro:** el Outbox ya tiene el `incidentId` — añadir la llamada a Salesforce es solo un paso más en el procesador del reconcile, sin cambiar el contrato del iPad

> **Acción pendiente:** Reunión con equipo de Atención al Cliente para definir si Salesforce recibe un webhook, si hay un caso con ID trackeable, o si se construye un módulo propio de gestión de casos.

---

## Q5 — Inventario de Catering

**Pregunta:** ¿Hay API de catering o necesitamos construir algo?

**Respuesta real:** **Hay que construir dos cosas:**
1. Un **CRM/portal web de menús** para que el equipo de catering ingrese la información de cada vuelo
2. Una **API** que recibe esa información y la sirve al iPad — diseñada para poder conectarse automáticamente a un sistema de catering real en el futuro si existe

**Decisión de arquitectura:**

### A. Portal Web de Catering (nuevo módulo)

Portal web administrativo (módulo en el mismo BFF NestJS o app Next.js separada) con los siguientes campos por vuelo:

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `flightId` | Text | Número de vuelo (ej. AV026) |
| `flightDate` | Date | Fecha del vuelo |
| `origin` / `destination` | Text | Ruta del vuelo |
| `service` | Enum | `BREAKFAST` / `LUNCH` / `DINNER` |
| `meals[]` | Array | Lista de platos (ver abajo) |

**Datos de cada plato (`meals[]`):**

| Campo | Tipo | Descripción |
|:------|:-----|:------------|
| `name` | Text | Nombre del plato |
| `description` | Text | Descripción completa |
| `category` | Enum | `ENTREE` / `MAIN` / `DESSERT` / `BEVERAGE` |
| `allergens` | Tags | `GLUTEN`, `DAIRY`, `NUTS`, `SHELLFISH`, `SOY`, etc. |
| `dietaryFlags` | Tags | `VEGETARIAN`, `VEGAN`, `HALAL`, `KOSHER`, `GLUTEN_FREE` |
| `initialStock` | Integer | Unidades físicamente cargadas al avión |
| `photoUrl` | Text? | Foto del plato (opcional) |

### B. Esquema en PostgreSQL

```sql
CREATE TABLE catering_menu (
  id              TEXT PRIMARY KEY,
  flight_id       TEXT NOT NULL,
  flight_date     DATE NOT NULL,
  service         TEXT NOT NULL CHECK (service IN ('BREAKFAST', 'LUNCH', 'DINNER')),
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN ('ENTREE', 'MAIN', 'DESSERT', 'BEVERAGE')),
  allergens       TEXT[],
  dietary_flags   TEXT[],
  initial_stock   INTEGER NOT NULL DEFAULT 0,
  photo_url       TEXT,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Diseño preparado para el futuro:** cuando exista una API de catering real, solo se cambia el origen de datos. El iPad nunca ve el cambio — consume el mismo `GET /api/v1/flights/:flightId/catering` de siempre.

---

## Q6 — MDM y restricciones P2P

**Pregunta:** ¿Hay restricciones MDM que bloqueen Bluetooth o Wi-Fi P2P?

**Respuesta real:** Los iPads **no tienen esa restricción** de MDM.

**Información adicional confirmada:**
- Los aviones **A320 tienen red Wi-Fi** del sistema de entretenimiento disponible — puede usarse como red LAN local para sincronización (más rápido y confiable que Bluetooth puro)
- Los aviones **B787:** pendiente confirmar si tienen access point disponible para la tripulación

**Decisión de arquitectura:**

### Estrategia de sincronización revisada por tipo de avión

| Flota | Canal Principal | Fallback | Notas |
|:------|:----------------|:---------|:------|
| **A320** | Wi-Fi local (red de entretenimiento) | Multipeer Connectivity (MPC) | Preferir Wi-Fi — más ancho de banda |
| **B787** | Multipeer Connectivity (MPC) | Bluetooth solo | Confirmar access point |

### Lógica de selección de canal

```typescript
// P2pSyncService — selección automática de canal
async selectSyncChannel(): Promise<'WIFI_LOCAL' | 'MULTIPEER'> {
  const net = await Network.getStatus();
  if (net.connected && net.connectionType === 'wifi') {
    // Intentar conectar al BFF local (sin internet) — timeout 500ms
    const isLocalOnly = await this.pingLocalEndpoint();
    if (isLocalOnly) return 'WIFI_LOCAL'; // red del avión sin internet
  }
  return 'MULTIPEER';
}
```

> **Acción pendiente:** Confirmar con TI si la red Wi-Fi del A320 permite tráfico entre dispositivos (algunas redes de entretenimiento aíslan clientes entre sí por seguridad — "client isolation").

---

## Q7 — Ventana de Conectividad Pre-Vuelo

**Pregunta:** ¿Cuántos minutos tiene la tripulación conectada antes de perder señal?

**Respuesta real:** La ventana es **más corta de lo esperado**. Los pasajeros pueden modificar asientos hasta ~15 min antes del vuelo → el cierre del manifiesto ocurre muy tarde. Ventana de sync real: **10-15 minutos o menos**.

**Decisión de arquitectura:**

La compresión y el Delta Sync **no son opcionales** — son requisitos de primera clase.

| Parámetro | Decisión |
|:----------|:---------|
| **Peso máximo del payload** | < 200 KB comprimido (objetivo: < 5s en 4G/LTE) |
| **Compresión** | `brotli` (mejor ratio) con fallback a `gzip` |
| **Fotos de pasajeros** | ❌ No se descargan |
| **Fotos de platos** | ⚠️ Opcionales — solo si el payload total queda < 200 KB |
| **Delta Sync** | ✅ Obligatorio para vuelos de conexión / múltiples tramos |
| **Prioridad de datos** | 1° Manifiesto + SSR, 2° Tier LifeMiles, 3° Alertas NPS, 4° Inventario Catering |
| **Trigger de sync** | Al conectar a Wi-Fi/4G Y al abrir la app |
| **Timeout de descarga** | 8 segundos → modo degradado con datos anteriores si falla |

**Estimación de peso del payload mínimo viable:**

```
Payload ~200 pax sin comprimir:
├── flightInfo              < 1 KB
├── seats[] (200 asientos)  < 5 KB
├── passengers[] (200 pax)  < 30 KB
├── npsAlerts[] (~10 pax)   < 5 KB
└── catering.meals (~10)    < 5 KB
─────────────────────────────────
Total sin comprimir: ~46 KB
Total con brotli:    ~12 KB ✅  (descarga en < 1s en 4G)
```

---

## Resumen de Decisiones y Acciones

### Decisiones técnicas tomadas

| # | Decisión | Impacto |
|:--|:---------|:--------|
| D1 | `ManifestAggregatorService` hace 3 llamadas paralelas (Amadeus + LifeMiles + Salesforce) con Circuit Breaker independiente por adapter | Alto |
| D2 | Caché de manifiestos en PostgreSQL por `flightId + date` — 1 llamada a sistemas legacy por vuelo | Alto |
| D3 | NPS Recovery se persiste en BD propia primero; integración Salesforce en Fase 2 | Medio |
| D4 | Construir Portal Web de Catering + API (preparado para API externa futura) | Alto |
| D5 | En A320 preferir Wi-Fi local de entretenimiento; MPC como fallback. En B787, MPC principal | Medio |
| D6 | Payload < 200 KB comprimido (brotli), sin fotos de pasajero, Delta Sync obligatorio, timeout 8s | Alto |

### Acciones pendientes (requieren confirmación externa)

| # | Acción | Bloquea |
|:--|:-------|:--------|
| A1 | Confirmar proveedor DCS real (Amadeus Altéa vs Sabre vs in-house) con TI | Adapter de integración |
| A2 | Verificar si hay contrato Bulk API con el proveedor GDS | Estrategia de caché |
| A3 | Reunión con Atención al Cliente: definir proceso de cierre de casos NPS en Salesforce | Fase 2 del Outbox |
| A4 | Confirmar si red Wi-Fi del A320 permite tráfico entre dispositivos (client isolation) | Estrategia sync A320 |
| A5 | Verificar si B787 tiene access point disponible para tripulación | Plugin MPC B787 |

### Nuevo componente en el roadmap

**Portal Web de Catering** — módulo adicional necesario:
- Formulario de ingreso de menús por vuelo (nombre, descripción, alérgenos, stock)
- Roles separados: personal de catering (escritura) vs. tripulación (solo lectura via app)
- Diseñado para reemplazar el ingreso manual con integración automática en el futuro
- **Estimación:** 2-3 semanas — puede ir en paralelo a Fase 1 del BFF

---

> **Este documento complementa** [`PROPUESTA_ARQUITECTURA.md`](./PROPUESTA_ARQUITECTURA.md). Las decisiones aquí tomadas refinan la implementación sin alterar la visión general del sistema.
