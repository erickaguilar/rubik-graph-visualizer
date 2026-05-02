# Rubik's Cube Graph Visualizer & AI Solver

Un sistema de alto rendimiento para el cálculo, persistencia y visualización de la topología de estados del Cubo de Rubik, diseñado para la experimentación con agentes autónomos y análisis de ingeniería inversa.

## 🚀 Características

- **Motor Lógico Optimizado:** Implementado en Python con `numpy` para cálculos de permutación ultrarrápidos basados en Teoría de Grupos.
- **Visualización 3D Interactiva:** Cubo de Rubik animado mediante WebGL (`react-force-graph-3d` y Three.js), inspirado visualmente en el proyecto [AdamWhiteHat/RubiksCubeControlWpf](https://github.com/AdamWhiteHat/RubiksCubeControlWpf).
- **Mapa de Topología en Tiempo Real:** Visualización dinámica del grafo de estados sincronizada con los movimientos físicos del cubo.
- **Persistencia Nativa de Grafos:** Integración con **ArangoDB** para almacenar millones de estados y transiciones.
- **Resolución mediante IA:** Algoritmo de búsqueda de rutas óptimas (A*/Shortest Path) integrado directamente con la base de datos de grafos.
- **Servidor MCP (Model Context Protocol):** Expone herramientas de lógica del cubo para que modelos de lenguaje (LLMs) y agentes puedan interactuar con el entorno.

## 🛠️ Arquitectura Técnica

- **Backend:** Python (FastAPI, NetworkX, python-arango).
- **Frontend:** React + Vite (WebGL, Three.js, Zustand).
- **Base de Datos:** ArangoDB (Ejecutada en Docker).
- **Protocolo:** Model Context Protocol (MCP) para integración con IA.

## 📦 Instalación y Configuración

### Requisitos Previos
- Docker y Docker Compose.
- Python 3.10+
- Node.js y npm.

### 1. Levantar la Base de Datos
```bash
docker compose up -d
```

### 2. Configurar el Backend
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt # (Asegúrate de generar o instalar networkx numpy pytest mcp fastapi uvicorn python-arango)
PYTHONPATH=. python3 src/api.py
```

### 3. Configurar el Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧠 Uso con IA (MCP)
Puedes conectar este proyecto a un cliente MCP (como el MCP Inspector o Claude Desktop) apuntando al servidor:
```bash
.venv/bin/python3 src/mcp_server.py
```

## 📈 Roadmap
- **v1.x:** Fundación determinista y visualización base. (Actual)
- **v2.x:** Integración profunda de agentes exploradores y heurísticas avanzadas.
- **v3.x:** Minería de grafos aplicada a criptografía de estados e ingeniería inversa.

---
**Desarrollado como prototipo avanzado para experimentación de sistemas de estados dinámicos.**
