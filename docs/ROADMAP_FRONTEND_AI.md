# Plan de Implementación: Frontend 3D Interactivo y Evolución para IA

Este documento detalla la estrategia para construir una interfaz visual interactiva del Cubo de Rubik y el plan de versionado para escalar el proyecto hacia un ecosistema gobernado por Inteligencia Artificial.

## 1. Inspiración y Enfoque Visual

La visión visual y funcional de este frontend está fuertemente inspirada en el repositorio de código abierto **[AdamWhiteHat/RubiksCubeControlWpf](https://github.com/AdamWhiteHat/RubiksCubeControlWpf)**. 

De este proyecto adoptaremos los siguientes principios clave y los llevaremos a la web:
*   **Dualidad de Vistas:** Implementar un visor 3D realista junto con un "mapa 2D desenrollado" que permita al usuario (y a la IA) ver y entender la topología completa sin tener que girar la cámara.
*   **Animación Fluida (Lock-step):** Las transiciones entre estados (ej. un giro `R`) no deben ser saltos instantáneos, sino rotaciones interpoladas matemáticamente (Quaternions) para que el ojo humano pueda rastrear el movimiento.
*   **Separación Lógica-Visual:** El modelo 3D es puramente estético; toda la validación matemática se realiza en nuestro motor Python ya construido (Fase 1).

---

## 2. Plan de Implementación Frontend (React + WebGL)

Para llevar la experiencia de escritorio (WPF) al navegador con alto rendimiento, utilizaremos el siguiente stack tecnológico en nuestro cliente web (Vite):

**Stack Tecnológico:**
*   `@react-three/fiber`: El motor de renderizado 3D (un wrapper de Three.js para React).
*   `@react-three/drei`: Helpers y controles de cámara (orbit controls, texturas, iluminación).
*   `zustand`: Gestor de estado global super ligero para sincronizar el 3D, el 2D y el Grafo de ArangoDB.

### Fases de Desarrollo del Frontend:

*   **Paso 1: Geometría Base:** Crear el "Core" del cubo. Un arreglo de 27 "Cubies" (pequeños cubos que forman el 3x3x3). Asignar colores a las caras exteriores usando coordenadas (X, Y, Z).
*   **Paso 2: Motor de Animación:** Implementar la lógica de rotación agrupada. Al recibir el comando `R`, seleccionar los 9 cubies de la derecha, agruparlos en un pivote (Pivot Object) y rotarlos suavemente 90 grados sobre el eje X usando `useFrame`.
*   **Paso 3: Sincronización Python:** Conectar los botones de la UI a nuestro backend FastAPI/MCP. Cada movimiento se envía al servidor para validar el cálculo, y la UI se actualiza basándose en la respuesta matemática.
*   **Paso 4: Mapa 2D:** Construir la vista de "plantilla" 2D interactiva, donde los 54 stickers se actualizan en sincronía con la vista 3D.

---

## 3. Plan de Versionado y Crecimiento para IA

Para garantizar que este proyecto no sea solo un juego, sino un "Entorno (Gym) de Entrenamiento e Interacción para Modelos de Lenguaje", proponemos el siguiente esquema de versionado (SemVer):

### Versión 1.x: "Fundación Determinista" (Fase Actual)
El objetivo es establecer las reglas físicas y matemáticas impecables.
*   **v1.0.0:** Backend funcional (Numpy) con validación de movimientos y servidor MCP básico. *(Completado)*
*   **v1.1.0:** Persistencia de Grafo en ArangoDB implementada, permitiendo guardar la topología. *(Completado)*
*   **v1.2.0:** Frontend React/Three.js interactivo (Cubo 3D y vista 2D inspirada en WPF).
*   **v1.3.0:** Sincronización total: El usuario gira el cubo 3D -> El backend lo procesa -> ArangoDB guarda el estado -> El visualizador de grafos se actualiza en pantalla.

### Versión 2.x: "Agentes Exploradores" (Integración Profunda IA)
El ecosistema MCP permite a la IA interactuar con el cubo.
*   **v2.0.0 (Agent Workspace):** Creación de un panel en el Frontend (tipo consola de chat) donde un agente MCP pueda proponer comandos lógicos de búsqueda.
*   **v2.1.0 (Heurísticas Autómatas):** Se dota al servidor MCP de funciones de búsqueda `A*` y `IDA*`. El agente de IA puede solicitar: *"Encuentra el camino de este estado al estado identidad usando A*"*.
*   **v2.2.0 (Replay Mode):** Cuando la IA deduce un algoritmo (ej. resolver un patrón específico), el Frontend lo anima paso a paso (modo tutorial generado por IA).

### Versión 3.x: "Minería del Grafo y Criptografía de Estados"
Llevar el proyecto a la frontera de la ingeniería inversa, tal como se mencionó en la documentación original de diseño.
*   **v3.0.0 (Topology Analyzer Agent):** Se entrena/configura un Agente especializado para navegar la base de datos de ArangoDB, buscando bucles (ciclos de conmutadores) y patrones recurrentes (Machine Learning sobre grafos).
*   **v3.1.0 (State Debugging):** Uso del sistema como alegoría de Ingeniería de Software: Inyectar un "payload corrupto" (cubo muy desordenado) y dejar que la IA ejecute procesos de "Traceback" visuales para normalizar los datos (resolver el cubo).