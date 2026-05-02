from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.database import get_db
from src.cube_engine import CubeState
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI(title="Rubik's Cube Graph API")

# Allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SequenceRequest(BaseModel):
    sequence: str

@app.get("/api/graph")
def get_graph():
    """Retrieve all nodes and edges from ArangoDB for the frontend."""
    db = get_db()
    
    nodes = []
    # Using AQL to fetch all vertices and format them
    cursor = db.db.aql.execute('FOR v IN CubeStates RETURN v')
    for vertex in cursor:
        nodes.append({
            "id": vertex["_key"],
            "is_solved": vertex["is_solved"],
            "val": 10 if vertex["is_solved"] else 3,
            "color": "#00ff00" if vertex["is_solved"] else "#1f78b4"
        })
        
    links = []
    # Using AQL to fetch all edges
    cursor = db.db.aql.execute('FOR e IN StateTransitions RETURN e')
    for edge in cursor:
        links.append({
            "source": edge["_from"].split("/")[1],
            "target": edge["_to"].split("/")[1],
            "move": edge["move"],
            "color": "#999999"
        })
        
    return {"nodes": nodes, "links": links}

@app.post("/api/sequence")
def apply_sequence(req: SequenceRequest):
    """Apply a sequence of moves from identity, persist to DB, and return the new graph."""
    db = get_db()
    cube = CubeState()
    
    # Save identity state just in case it's empty
    db.save_state(cube.get_hash(), cube.is_solved())
    
    current = cube
    moves = req.sequence.strip().split()
    
    for move in moves:
        if not move:
            continue
        next_state = current.apply_move(move)
        
        # Save to graph DB
        db.save_state(next_state.get_hash(), next_state.is_solved())
        db.save_transition(current.get_hash(), next_state.get_hash(), move)
        
        current = next_state
        
    # Return the updated graph so the frontend can react immediately
    return get_graph()

class SolveRequest(BaseModel):
    sequence: str

@app.post("/api/solve")
def solve_cube(req: SolveRequest):
    """Find the shortest path from the current state to the identity state."""
    db = get_db()
    identity = CubeState()
    target_hash = identity.get_hash()
    
    # Calculate current state by applying the known sequence
    current_state = identity.apply_sequence(req.sequence)
    current_hash = current_state.get_hash()
    
    if current_hash == target_hash:
        return {"moves": [], "error": "Cube is already solved."}
    
    raw_path = db.find_shortest_path(current_hash, target_hash)
    if not raw_path:
        return {"moves": [], "error": "No path found in the known graph. Explore more nodes first!"}
        
    moves = []
    current_vertex = current_hash

    
    for step in raw_path:
        # The first step usually has edge=None
        if not step.get("edge"):
            continue
            
        edge = step["edge"]
        move = edge["move"]
        
        # If the edge went FROM the current vertex, we are walking forward, so apply the move.
        # If the edge went TO the current vertex, we are walking backward along the edge, so apply the inverse move.
        from_key = edge["_from"].split("/")[1]
        
        if from_key == current_vertex:
            moves.append(move)
        else:
            # Invert the move: R -> R', R' -> R, R2 -> R2
            if move.endswith("'"):
                moves.append(move[0])
            elif move.endswith("2"):
                moves.append(move)
            else:
                moves.append(move + "'")
                
        current_vertex = step["vertex"]
        
    return {"moves": moves}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

