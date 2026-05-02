# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.3.0] - 2026-05-02
### Añadido
- Integración de **Resolución por IA** usando el algoritmo de camino más corto nativo de ArangoDB.
- Sincronización total (Lock-step) entre la animación 3D y la persistencia en el backend.
- Botón "Resolver con IA" en el panel de control del frontend.
- Nuevo endpoint POST `/api/solve` para búsqueda heurística de rutas de solución.

### Corregido
- Bug de "Piezas Fantasma" en el motor 3D causado por errores de punto flotante en Cuaterniones.
- Refactorización de `Cube3D` usando `useRef` para manejar estados de alta velocidad de la IA sin lag de React.
- Error de sintaxis AQL en la consulta `SHORTEST_PATH`.

## [1.2.0] - 2026-05-01
### Añadido
- Interfaz visual 3D interactiva usando `@react-three/fiber`.
- Animaciones fluidas de rotación para las 6 caras del cubo.
- Panel de controles UI con los movimientos estándar del Cubo de Rubik.
- Diseño de pantalla dividida (Split-View) para ver el Cubo 3D y el Grafo de Topología simultáneamente.

## [1.1.0] - 2026-05-01
### Añadido
- Capa de persistencia con **ArangoDB**.
- Esquema de grafo `RubikGraph` con colecciones para Estados (Vértices) y Transiciones (Aristas).
- Herramienta MCP `expand_node` para generación dinámica de topología masiva.
- Backend FastAPI para servir datos del grafo al cliente web.

## [1.0.0] - 2026-05-01
### Añadido
- Motor matemático base en Python usando `numpy` (Permutaciones de 54 stickers).
- Suite de pruebas unitarias para validar la integridad de los movimientos.
- Servidor MCP inicial con herramientas básicas (`get_identity_state`, `apply_sequence`).
- Configuración inicial de Gitflow y estructura de carpetas.

---
*Basado en principios de Ingeniería Inversa y Teoría de Grupos.*
