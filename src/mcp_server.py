from mcp.server.fastmcp import FastMCP
from typing import List, Optional
from pydantic import BaseModel, Field
import json
import traceback
import sys
import os

# Add the project root to sys.path so 'src' can be imported regardless of execution directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.cube_engine import CubeState, MOVES
from src.database import get_db

# Initialize FastMCP server
mcp = FastMCP("Rubik's Cube Logic Engine")

class CubeResponse(BaseModel):
    state_array: List[int] = Field(description="Arreglo de 54 elementos que representa los colores del cubo")
    state_hash: str = Field(description="Identificador único (hash) del estado actual")
    is_solved: bool = Field(description="Indica si el cubo se encuentra en su estado resuelto (identidad)")

class PathResponse(BaseModel):
    final_state: CubeResponse
    path: List[str] = Field(description="La secuencia de movimientos que se aplicaron")
    intermediate_hashes: List[str] = Field(description="Hashes de los estados intermedios visitados durante la secuencia")

class ExpandResponse(BaseModel):
    message: str = Field(description="Mensaje de éxito")
    depth_reached: int = Field(description="Profundidad alcanzada")

@mcp.tool()
def get_identity_state() -> CubeResponse:
    """Obtener el estado resuelto (identidad) del cubo de Rubik."""
    cube = CubeState()
    return CubeResponse(
        state_array=cube.state.tolist(),
        state_hash=cube.get_hash(),
        is_solved=cube.is_solved()
    )

@mcp.tool()
def get_available_moves() -> List[str]:
    """Obtener una lista de todos los movimientos válidos permitidos."""
    return list(MOVES.keys())

@mcp.tool()
def apply_sequence(sequence: str, start_state: Optional[List[int]] = None) -> PathResponse:
    """Aplica una secuencia de movimientos separados por espacio a un estado del cubo.
    
    Args:
        sequence: Movimientos separados por espacio (ej. 'R U R' U').
        start_state: Arreglo opcional de 54 elementos. Si no se provee, inicia desde el estado resuelto.
    """
    try:
        cube = CubeState(start_state)
    except Exception as e:
        raise ValueError(f"Invalid start_state: {str(e)}")

    moves = sequence.strip().split()
    path = []
    hashes = [cube.get_hash()]
    
    current = cube
    for move in moves:
        if not move:
            continue
        try:
            current = current.apply_move(move)
            path.append(move)
            hashes.append(current.get_hash())
        except ValueError as e:
            raise ValueError(f"Failed at move '{move}': {str(e)}")

    return PathResponse(
        final_state=CubeResponse(
            state_array=current.state.tolist(),
            state_hash=current.get_hash(),
            is_solved=current.is_solved()
        ),
        path=path,
        intermediate_hashes=hashes
    )

@mcp.tool()
def expand_node(depth: int, start_state: Optional[List[int]] = None) -> ExpandResponse:
    """Expande el grafo de estados a partir de un nodo y los guarda en ArangoDB.
    
    Args:
        depth: Número de movimientos de profundidad a explorar (ej. 1 o 2). ¡Cuidado, crece exponencialmente!
        start_state: Arreglo opcional. Si no se provee, inicia desde la identidad.
    """
    try:
        cube = CubeState(start_state)
    except Exception as e:
        raise ValueError(f"Invalid start_state: {str(e)}")
        
    db = get_db()
    db.expand_node(CubeState, cube, depth=depth)
    
    return ExpandResponse(
        message=f"Grafo expandido exitosamente hasta profundidad {depth}",
        depth_reached=depth
    )

if __name__ == "__main__":
    # You can run the server directly
    print("Starting Rubik's Cube MCP Server...")
    mcp.run()
