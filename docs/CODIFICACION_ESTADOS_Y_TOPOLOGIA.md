<!--
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
-->

# 🧩 Codificación de Estados, Huella Digital y Topología en el Cubo de Rubik

Este documento detalla la especificación matemática, la estructura de datos en memoria y la interpretación visual de la **codificación de estados** utilizada por el motor en Rust ([`crates/wasm_core/src/cube.rs`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/crates/wasm_core/src/cube.rs)) y el visualizador de topología 3D ([`crates/wasm_core/src/graph.rs`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/crates/wasm_core/src/graph.rs)).

---

## 1. Estructura Física y Modelo de Facetas (54 Stickers)

Un cubo de Rubik estándar de $3 \times 3 \times 3$ consta de **6 caras**, cada una subdividida en una cuadrícula de $3 \times 3$ pegatinas (*stickers* o facetas):
$$\text{Total de Facetas} = 6 \text{ caras} \times 9 \text{ stickers} = 54 \text{ facetas}$$

En el motor matemático de Rust ([`cube.rs`](file:///home/erickaguilar/Documentos/rubik-graph-visualizer/crates/wasm_core/src/cube.rs#L125-L160)), el estado completo se modela como un vector contiguo de bytes de longitud fija:
```rust
pub const NUM_STICKERS: usize = 54;

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct CubeState {
    pub stickers: [u8; NUM_STICKERS],
}
```

Cada una de las 6 caras tiene asignado un identificador numérico canónico de `0` a `5`:

| Índice (`u8`) | Cara WCA | Nombre | Color Canónico | Rango de Facetas | Posición en el Hash Hexadecimal |
| :---: | :---: | :---: | :---: | :---: | :---: |
| `00` | **U** | Up / Superior | Blanco / Amarillo | Stickers 0 a 8 | Índices 0..17 (9 bytes × 2 caracteres hex = 18 caracteres) |
| `01` | **D** | Down / Inferior | Amarillo / Blanco | Stickers 9 a 17 | Índices 18..35 (18 caracteres) |
| `02` | **F** | Front / Frontal | Verde | Stickers 18 a 26 | Índices 36..53 (18 caracteres) |
| `03` | **B** | Back / Posterior | Azul | Stickers 27 a 35 | Índices 54..71 (18 caracteres) |
| `04` | **L** | Left / Izquierda | Naranja | Stickers 36 a 44 | Índices 72..89 (18 caracteres) |
| `05` | **R** | Right / Derecha | Rojo | Stickers 45 a 53 | Índices 90..107 (18 caracteres) |

---

## 2. Generación del Hash Canónico del Estado (`get_hash`)

Para indexar de forma única cualquier estado en la tabla hash en memoria (`HashMap<String, NodeData>`) e IndexedDB sin colisiones, el estado del cubo serializa sus 54 bytes en una cadena hexadecimal de **108 caracteres**:

```rust
pub fn get_hash(&self) -> String {
    let mut s = String::with_capacity(NUM_STICKERS * 2);
    for &byte in &self.stickers {
        use std::fmt::Write;
        write!(&mut s, "{:02x}", byte).unwrap();
    }
    s
}
```

### 2.1 El Nodo Central: Estado Resuelto (Elemento Identidad $e$)
En el estado inicial o resuelto (`CubeState::new()`), cada cara contiene sus 9 pegatinas con el mismo valor homogéneo. Por consiguiente, su hash es una secuencia perfectamente ordenada de números:

```text
000000000000000000010101010101010101020202020202020202030303030303030303040404040404040404050505050505050505
```

- **9 veces `00`**: Todas las facetas de la cara superior (`U`) coinciden.
- **9 veces `01`**: Todas las facetas de la cara inferior (`D`) coinciden.
- **9 veces `02`**: Todas las facetas de la cara frontal (`F`) coinciden.
- **9 veces `03`**: Todas las facetas de la cara posterior (`B`) coinciden.
- **9 veces `04`**: Todas las facetas de la cara izquierda (`L`) coinciden.
- **9 veces `05`**: Todas las facetas de la cara derecha (`R`) coinciden.

En el grafo topológico tridimensional, este estado representa la **identidad ($e$) del Grupo de Rubik $(\mathcal{G})$** y se ancla rígidamente en el origen de coordenadas:
```rust
fx: if is_solved { Some(0.0) } else { None },
fy: if is_solved { Some(0.0) } else { None },
fz: if is_solved { Some(0.0) } else { None },
```
Visualmente se representa como una esfera verde de gran masa (`val: 10`, color `#00ff00`).

---

### 2.2 Los Nodos Periféricos: Permutaciones de Estados (Órbitas)
Cuando el usuario ejecuta giros canónicos (`U`, `R`, `F'`, etc.), las 54 facetas sufren una permutación cíclica determinista:
$$\sigma \in S_{48}$$

En consecuencia, los números del vector de 54 facetas se mezclan e intercalan:
```text
000400040002010101010101050202020202030303030303040404040404050505050505...
```

Este hash actúa como una **huella digital inmutable y no ambigua** de la posición:
- Dos secuencias de movimientos distintas que lleguen a la misma configuración geométrica producirán **exactamente el mismo hash**, detectando ciclos y evitando la duplicación de nodos en el grafo de Cayley.
- Los nodos derivados se representan con esferas azules (`val: 3`, color `#1f78b4`) conectadas por aristas direccionales.

---

## 3. Topología de Aristas y Transiciones Bidireccionales

Cada arista en el grafo modela una transición de estado inducida por un operador del conjunto generador $S$:
$$u \xrightarrow{\quad g \quad} v \quad \iff \quad v = u \cdot g$$

```rust
pub struct Edge {
    pub source: String,
    pub target: String,
    pub move_name: String,
}
```

- **Arista directa:** Etiquetada con el movimiento realizado (por ejemplo, `R`).
- **Arista inversa:** Permite la navegación en retroceso mediante el movimiento opuesto (por ejemplo, `R'`), calculada automáticamente mediante la función de inversión canónica:
  $$g \cdot g^{-1} = e$$

---

## 4. Métricas Visuales en la Interfaz (UI HUD)

En el panel superior del visor de topología:
- **Nodos:** Cantidad total de configuraciones de estado únicas exploradas y conservadas en la memoria local (IndexedDB).
- **Aristas:** Cantidad de conexiones o transiciones físicas (giros de $90^\circ$ o $180^\circ$) descubiertas entre los nodos.
- **Botón Centrar:** Permite enfocar instantáneamente la cámara orbital en el elemento identidad $(0, 0, 0)$ o encuadrar todo el grafo de forma automática mediante `zoomToFit()`.
