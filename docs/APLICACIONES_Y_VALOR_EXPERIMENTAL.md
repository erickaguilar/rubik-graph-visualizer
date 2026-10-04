# 🔬 Fundamentos Teóricos, Valor Experimental y Aplicaciones Científicas

Este documento describe el alcance conceptual, el trasfondo matemático y el potencial de investigación del proyecto **Rubik's Cube 3D Visualizer & Topology Graph Solver**.

---

## 🧭 Introducción

A simple vista, el Cubo de Rubik suele percibirse como un rompecabezas mecánico o un pasatiempo. Sin embargo, en la informática teórica y las matemáticas discretas, constituye uno de los **sistemas dinámicos deterministas y finitos más ricos y rigurosos conocidos**.

Con un espacio de estados compuesto por:
$$\frac{8! \times 3^7 \times 12! \times 2^{11}}{2} \approx 4.3252 \times 10^{19} \text{ estados posibles}$$
el Cubo de Rubik ofrece un escenario canónico donde el problema de búsqueda es formalmente intratable mediante enumeración exhaustiva (fuerza bruta), pero completamente estructurado y regido por leyes algebraicas inviolables.

Este proyecto implementa un banco de pruebas experimental en tiempo real que traslada este espacio a una representación topológica interactiva sobre WebAssembly y WebGL.

---

## 📐 1. Teoría de Grupos y Grafos de Cayley (Álgebra Abstracta)

### 1.1 El Grupo de Rubik $(\mathcal{G}, \cdot)$
El Cubo de Rubik forma un grupo matemático no abeliano $(\mathcal{G})$ actuando sobre un conjunto de 54 facetas (stickers):
- **Generadores del grupo:** Las rotaciones canónicas en 90° de las seis caras:
  $$S = \{U, U', U^2, D, D', D^2, R, R', R^2, L, L', L^2, F, F', F^2, B, B', B^2\}$$
- **Propiedades algebraicas:**
  - **Identidad $(e)$:** El estado resuelto del cubo.
  - **Inversos:** Para cada movimiento $g$, existe $g^{-1}$ tal que $g \cdot g^{-1} = e$.
  - **No conmutatividad:** En general, $U \cdot R \neq R \cdot U$.
  - **Conmutadores:** La expresión $[A, B] = A B A^{-1} B^{-1}$ mide la desviación de la conmutatividad y es la base de las secuencias operativas aisladas (*trigueros*, permutaciones de esquinas/aristas sin alterar el resto del cubo).

### 1.2 El Grafo de Cayley $\Gamma(\mathcal{G}, S)$
La visualización en 3D del panel derecho representa un subgrafo local inducido del **Grafo de Cayley**:
- **Vértices:** Cada configuración $s \in \mathcal{G}$.
- **Aristas dirigidas:** Pares ordenados $(u, v)$ etiquetados con el generador $g \in S$ tal que $v = u \cdot g$.
- **Métrica de Palabras:** La distancia más corta en el grafo entre dos nodos corresponde a la longitud mínima de palabra en el grupo para transformar una configuración en otra. El diámetro total del grafo de Cayley completo del Cubo de Rubik es el famoso **"Número de Dios"** (exactamente 20 movimientos bajo la métrica Half-Turn Metric o 26 bajo Quarter-Turn Metric).

---

## 🤖 2. Banco de Pruebas para Algoritmos de Búsqueda y Heurísticas (IA)

En inteligencia artificial y robótica autónoma, los problemas reales (planificación de misiones espaciales, logística y transporte multimodal, plegamiento de proteínas) comparten la misma característica: **un espacio de estados colosal con un factor de ramificación alto ($b=18$)**.

Este visualizador proporciona un entorno reactivo para investigar y validar:

1. **Búsqueda en Grafos (Graph Search):**
   - Análisis comparativo de **BFS (Breadth-First Search)**, **A\*** e **IDA\* (Iterative Deepening A\*)**.
2. **Bases de Datos de Patrones (Pattern Databases - PDB):**
   - Precomputación de subgrafos de proyecciones canónicas (ej. resolver solo las esquinas o solo las aristas) para derivar heurísticas admisibles $h(n)$ consistentes.
3. **Reducción de Espacio (Two-Phase Algorithm / Kociemba):**
   - Transición entre subgrupos: $\mathcal{G}_0 \rightarrow \mathcal{G}_1 = \langle U, D, R^2, L^2, F^2, B^2 \rangle \rightarrow \{e\}$.
4. **Agentes de Aprendizaje por Refuerzo:**
   - Entrenamiento de agentes autónomos (DeepCubeA / Q-Learning) evaluando la policy value frente a la topología real del grafo.

---

## 🔐 3. Criptografía y Criptoanálisis de Estados

Existe una estrecha correlación entre los grafos expansores no abelianos y la criptografía moderna:

1. **Funciones Hash de Cayley (ej. Charles-Goren-Lauter):**
   - Diseñadas a partir de caminos en grafos de Cayley sobre curvas elípticas supersingulares o matrices $SL_2(\mathbb{F}_p)$.
   - La seguridad unidireccional (*preimage resistance*) radica en que avanzar paso a paso (mezclar) es trivialmente calculable, mientras que hallar un ciclo corto o el camino inverso a la identidad sin conocer la factorización del camino requiere resolver un problema computacionalmente duro.
2. **Criptoanálisis de Ciclos y Colisiones:**
   - La detección de subciclos cerrados ($R U R' U' \dots$) simula el hallazgo de colisiones criptográficas en redes de permutación.
3. **Grafos Expansores y Ramanujan:**
   - Análisis de la velocidad con la que una caminata aleatoria (*random walk*) sobre los generadores alcanza una distribución uniforme en el espacio de estados.

---

## 🕵️ 4. Ingeniería Inversa de Sistemas de "Caja Negra" (Black-Box Systems)

El proyecto ofrece un modelo experimental para inferir dinámicas de sistemas cerrados:

- **Escenario:** Un agente u observador no posee el código fuente ni conoce las reglas físicas del cubo; solo tiene acceso a una interfaz de prueba donde puede ejecutar acciones discretas y observar el identificador hash resultante.
- **Objetivo de Ingeniería Inversa:**
  - Reconstruir la matriz de adyacencia y determinar si el sistema es determinista o estocástico.
  - Identificar simetrías, invariantes y leyes de conservación (ej. la paridad de permutación de esquinas y aristas).
  - Deducir que ciertas combinaciones son invariantes de orden 4 ($g^4 = e$) o de orden 2 ($g^2 = e$).

---

## ⚡ 5. Arquitectura de Cómputo Cliente (Edge & Zero-Backend Architecture)

Más allá de las matemáticas, este experimento aporta valor práctico a la ingeniería de software moderna:

1. **Eliminación Total de Servidores (Zero-Cost Hosting):**
   - Demuestra que cálculos tradicionalmente delegados a servidores backend (con Python, bases de datos Docker y APIs REST) pueden compilarse a **WebAssembly (Rust)** y ejecutarse en el navegador con latencia $< 1$ ms.
2. **Persistencia No Servidor con IndexedDB:**
   - Almacenamiento local masivo de grafos en el dispositivo del usuario, ofreciendo experiencia offline nativa sin bases de datos remotas.
3. **Simulación de Física y Fuerzas WebGL:**
   - Despliegue de grafos 3D interactivos con decenas de miles de elementos sin degradar la tasa de cuadros (60 FPS) mediante Three.js y WebGL.

---

## 📚 Referencias y Lecturas Complementarias

- **Kociemba, H.** (1992). *The Two-Phase Algorithm for Solving Rubik's Cube*.
- **Korf, R. E.** (1997). *Finding Optimal Solutions to Rubik's Cube Using Pattern Databases*. AAAI/IAAI.
- **McAleer, S., Forest, F., Petersen, A., & Baldi, P.** (2019). *Solving the Rubik's Cube with Deep Reinforcement Learning and Search (DeepCubeA)*. Nature Machine Intelligence.
- **Charles, D. X., Goren, K. E., & Lauter, K. E.** (2009). *Cryptographic Hash Functions from Expander Graphs*. Journal of Cryptology.
- **Joyner, D.** (2008). *Adventures in Group Theory: Rubik's Cube, Merlin's Machine, and Other Mathematical Toys*. Johns Hopkins University Press.
- **Documento complementario:** [`docs/CODIFICACION_ESTADOS_Y_TOPOLOGIA.md`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/docs/CODIFICACION_ESTADOS_Y_TOPOLOGIA.md) - Especificación de los 54 stickers, codificación hexadecimal y topología de estados.
