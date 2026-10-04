# Rubik's Cube 3D Visualizer & Topology Graph Solver (Wasm + Rust) 🦀⚡

Un sistema de alto rendimiento para el cálculo, análisis y visualización en tiempo real de la topología de estados del Cubo de Rubik, impulsado por un motor nativo en **Rust compilado a WebAssembly (Wasm)** y renderizado en **React + Three.js**.

> **Arquitectura Unificada (Zero-Services):** 100% Client-Side. Cero contenedores Docker, cero dependencias de Python y latencia < 1 ms. Con persistencia offline mediante **IndexedDB** y listo para desplegar en **Vercel** o cualquier CDN estático.

---

## 🚀 Características Principales

- **Motor Lógico en Rust (Wasm Core):** Modelado determinista de 54 stickers (`[u8; 54]`) basado en Teoría de Grupos, ejecutándose a velocidad casi nativa en el navegador sin pausas de Garbage Collector.
- **Topología de Grafos en Memoria:** Grafo dinámico de estados y transiciones en memoria RAM (`hashbrown::HashMap`), sin necesidad de bases de datos externas pesadas.
- **Visualización 3D Sincronizada:** Cubo físico interactivo animado mediante Three.js (`@react-three/fiber` y `@react-three/drei`) con cámara calibrada y proporciones ortogonales limpias.
- **Visor de Grafo Tridimensional:** Visualización en tiempo real del hipergrafo de estados mediante `react-force-graph-3d`, con el nodo resuelto (centro) anclado en `(0, 0, 0)` y el estado actual resaltado.
- **Resolución Instantánea (BFS / A* Solver):** Algoritmo de búsqueda de rutas óptimas (camino más corto hacia el estado resuelto) computado en microsegundos dentro de WebAssembly.
- **Persistencia Offline con IndexedDB:** Auto-guardado en segundo plano de todos los nodos y aristas explorados. Los datos se conservan al cerrar o recargar la pestaña.
- **Portabilidad Total:** Empaquetado como una Single Page Application (SPA) para alojamiento gratuito en Vercel, Netlify o GitHub Pages.

---

## 🔬 Valor Experimental y Aplicaciones Científicas

Este proyecto trasciende el concepto lúdico tradicional y opera como un **laboratorio experimental de modelado de estados complejos**:

1. **Álgebra Abstracta y Grafos de Cayley:** Visualización interactiva del Grupo del Cubo de Rubik $(\mathcal{G})$, un subgrupo no conmutativo del grupo simétrico $S_{48}$ con más de $4.32 \times 10^{19}$ estados posibles.
2. **Benchmark para Algoritmos de Búsqueda:** Entorno para evaluar heurísticas admisibles, Bases de Datos de Patrones (PDB) y algoritmos de reducción de subgrupos (Kociemba / A* / IDA*).
3. **Criptografía Basada en Grafos:** Simulación de caminos unidireccionales en grafos expansores no abelianos (paralelo a funciones hash de Cayley y criptografía post-cuántica).
4. **Ingeniería Inversa de Sistemas "Caja Negra":** Plataforma de experimentación para agentes autónomos que buscan inferir invariantes y leyes de conservación a partir de matrices de transición observables.
5. **Cómputo Edge de Alto Rendimiento:** Demostración práctica de migración de cargas intensivas desde servidores hacia WebAssembly en el cliente, eliminando costos de infraestructura.

> 📖 Para una profundización matemática y algorítmica completa, consulta los documentos técnicos:
> - **[`docs/APLICACIONES_Y_VALOR_EXPERIMENTAL.md`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/docs/APLICACIONES_Y_VALOR_EXPERIMENTAL.md)**: Fundamentos teóricos, teoría de grupos y aplicaciones de investigación.
> - **[`docs/CODIFICACION_ESTADOS_Y_TOPOLOGIA.md`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/docs/CODIFICACION_ESTADOS_Y_TOPOLOGIA.md)**: Especificación de los 54 stickers, codificación hexadecimal y significado de los nodos en la topología.

---

## 🛠️ Arquitectura Técnica

```text
┌──────────────────────────────────────────────────────────┐
│                    Navegador Web                         │
│                                                          │
│   React 19 + Three.js                Rust (WebAssembly)  │
│  ┌───────────────────────┐          ┌──────────────────┐ │
│  │ • Render 3D del Cubo  │          │ • Motor de Giros │ │
│  │ • Grafo de Fuerzas    │◄────────►│ • Grafo Estados  │ │
│  │ • Zustand Store       │  (<1ms)  │ • Solver BFS/A*  │ │
│  │ • IndexedDB Sync      │          │ • Serialización  │ │
│  └───────────────────────┘          └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Core & Algoritmos:** Rust 2021 (`wasm-bindgen`, `serde`, `serde_json`, `serde-wasm-bindgen`).
- **Frontend:** React 19, TypeScript, Three.js, React Three Fiber, Zustand.
- **Persistencia:** IndexedDB API nativa (`RubikGraphDB`).
- **Bundler:** Vite 8.

---

## 📦 Instalación y Ejecución Local

### Requisitos Previos
- **Node.js** (v18+) y `npm`.
- *(Opcional, solo para recompilar Rust)*: `cargo` y `wasm-pack`.

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/erickaguilar/rubik-graph-visualizer.git
cd rubik-graph-visualizer
cd frontend && npm install
```

### 2. Iniciar el Entorno de Desarrollo
Desde la raíz del proyecto:
```bash
npm run dev
```
Abre en tu navegador la URL indicada (normalmente **`http://localhost:5173`**).

---

## 💻 Scripts Disponibles

Desde la raíz del proyecto:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo Vite con HMR. |
| `npm run build` | Compila el bundle estático de producción (`frontend/dist`) con el binario Wasm. |
| `npm run test:wasm` | Ejecuta la suite de tests unitarios en Rust con `cargo test`. |
| `npm run build:wasm` | Recompila el crate `wasm_core` con `wasm-pack` hacia `frontend/src/pkg`. |

---

## ☁️ Despliegue en Vercel

La aplicación está lista para desplegarse en Vercel sin necesidad de configurar compiladores de Rust en el servidor de CI:

1. Importa tu repositorio en **Vercel**.
2. Configura los parámetros del proyecto:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Haz clic en **Deploy**. El artefacto estático quedará activo globalmente en una URL pública `.vercel.app`.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **Apache 2.0**. Para más detalles, consulta el archivo [LICENSE](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/LICENSE).

```text
Copyright 2026 Erick Aguilar

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
