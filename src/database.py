from arango import ArangoClient
import logging

logger = logging.getLogger(__name__)

class GraphDB:
    def __init__(self, host='http://localhost:8529', password='password', db_name='rubik'):
        self.client = ArangoClient(hosts=host)
        self.sys_db = self.client.db('_system', username='root', password=password)
        
        # Create database if it doesn't exist
        if not self.sys_db.has_database(db_name):
            self.sys_db.create_database(db_name)
            logger.info(f"Created database: {db_name}")
            
        self.db = self.client.db(db_name, username='root', password=password)
        self._init_collections()

    def _init_collections(self):
        # Vertices (States)
        if not self.db.has_collection('CubeStates'):
            self.states = self.db.create_collection('CubeStates')
            logger.info("Created collection: CubeStates")
        else:
            self.states = self.db.collection('CubeStates')

        # Edges (Moves)
        if not self.db.has_collection('StateTransitions'):
            self.transitions = self.db.create_collection('StateTransitions', edge=True)
            logger.info("Created edge collection: StateTransitions")
        else:
            self.transitions = self.db.collection('StateTransitions')
            
        # Graph definition
        if not self.db.has_graph('RubikGraph'):
            self.graph = self.db.create_graph(
                'RubikGraph',
                edge_definitions=[{
                    'edge_collection': 'StateTransitions',
                    'from_vertex_collections': ['CubeStates'],
                    'to_vertex_collections': ['CubeStates']
                }]
            )
            logger.info("Created graph: RubikGraph")
        else:
            self.graph = self.db.graph('RubikGraph')

    def save_state(self, state_hash: str, is_solved: bool):
        """Save a cube state as a vertex."""
        # In ArangoDB, '_key' is the primary key.
        doc = {'_key': state_hash, 'is_solved': is_solved}
        try:
            self.states.insert(doc)
        except Exception as e:
            if "unique constraint violated" not in str(e).lower():
                raise e

    def save_transition(self, from_hash: str, to_hash: str, move: str):
        """Save a move as a directed edge between two states."""
        edge = {
            '_from': f'CubeStates/{from_hash}',
            '_to': f'CubeStates/{to_hash}',
            'move': move
        }
        try:
            # We don't specify _key so it auto-generates, but we can query by _from and _to
            self.transitions.insert(edge)
        except Exception as e:
            # ArangoDB might complain if we try to insert exact duplicates if we had a unique index, 
            # but by default it generates new keys.
            pass

    def expand_node(self, state_engine, current_state, depth=1):
        """BFS expansion starting from a state, saving everything to ArangoDB."""
        # Note: 'state_engine' is the CubeState instance
        queue = [(current_state, 0)]
        visited = set()
        
        while queue:
            state, current_depth = queue.pop(0)
            state_hash = state.get_hash()
            
            if state_hash in visited:
                continue
                
            visited.add(state_hash)
            self.save_state(state_hash, state.is_solved())
            
            if current_depth < depth:
                from src.cube_engine import MOVES
                for move in MOVES.keys():
                    try:
                        next_state = state.apply_move(move)
                        next_hash = next_state.get_hash()
                        
                        self.save_state(next_hash, next_state.is_solved())
                        self.save_transition(state_hash, next_hash, move)
                        
                        if next_hash not in visited:
                            queue.append((next_state, current_depth + 1))
                    except Exception as e:
                        logger.error(f"Failed to expand move {move}: {e}")

    def find_shortest_path(self, start_hash: str, target_hash: str):
        """Find the shortest path between two states using ArangoDB native graph traversal."""
        query = """
        FOR v, e IN ANY SHORTEST_PATH
            @start_id TO @target_id
            GRAPH 'RubikGraph'
            RETURN {
                vertex: v._key,
                edge: e
            }
        """
        bind_vars = {
            'start_id': f'CubeStates/{start_hash}',
            'target_id': f'CubeStates/{target_hash}'
        }
        
        try:
            cursor = self.db.aql.execute(query, bind_vars=bind_vars)
            path = [doc for doc in cursor]
            return path
        except Exception as e:
            logger.error(f"Failed to find shortest path: {e}")
            return []

# Expose a singleton instance
db = None
def get_db():
    global db
    if db is None:
        db = GraphDB()
    return db