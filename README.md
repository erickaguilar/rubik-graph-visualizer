# Rubik's Cube 3D Visualizer & Topology Graph Solver (Wasm + Rust) 🦀⚡

Un sistema de alto rendimiento para el cálculo, análisis y visualización en tiempo real de la topología de estados del Cubo de Rubik, impulsado por un motor nativo en **Rust compilado a WebAssembly (Wasm)** y renderizado en **React + Three.js**.

> **Arquitectura Unificada (Zero-Services):** 100% Client-Side. Cero contenedores Docker, cero dependencias de Python y latencia < 1 ms. Listo para desplegar en **Vercel** o cualquier CDN estático.

---

## 🚀 Características Principales

- **Motor Lógico en Rust (Wasm Core):** Modelado determinista de 54 stickers (`[u8; 54]`) basado en Teoría de Grupos, ejecutándose a velocidad casi nativa en el navegador sin pausas de Garbage Collector.
- **Topología de Grafos en Memoria:** Grafo dinámico de estados y transiciones en memoria RAM (`hashbrown::HashMap`), sin necesidad de bases de datos externas pesadas.
- **Visualización 3D Sincronizada:** Cubo físico interactivo animado mediante Three.js (`@react-three/fiber` y `@react-three/drei`).
- **Visor de Grafo Tridimensional:** Visualización en tiempo real del hipergrafo de estados mediante `react-force-graph-3d`.
- **Resolución Instantánea (BFS Solver):** Algoritmo de búsqueda de rutas óptimas (camino más corto hacia el estado resuelto) computado en microsegundos dentro de WebAssembly.
- **Portabilidad Total:** Puede empaquetarse como una Single Page Application (SPA) y alojarse gratuitamente en Vercel, Netlify o GitHub Pages.

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
│  └───────────────────────┘          └──────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Core & Algoritmos:** Rust 2021 (`wasm-bindgen`, `serde-wasm-bindgen`).
- **Frontend:** React 19, TypeScript, Three.js, React Three Fiber, Zustand.
- **Bundler:** Vite 8 con `vite-plugin-wasm`.

---

## 📦 Instalación y Ejecución Local

### Requisitos Previos
- **Node.js** (v18+) y `npm`.
- *(Opcional, solo si modificas el código en Rust)*: `cargo` y `wasm-pack`.

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
| `npm run test:wasm` | Ejecuta la suite de 10 tests unitarios en Rust con `cargo test`. |
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
