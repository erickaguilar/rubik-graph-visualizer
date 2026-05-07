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
        
        # In-memory cache for state hashes to avoid redundant DB hits
        self.known_states = self._load_known_states()

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

    def _load_known_states(self) -> set:
        """Load all existing state hashes from the database into memory."""
        logger.info("Loading known states into cache...")
        try:
            # We only need the keys (_key)
            cursor = self.db.aql.execute('FOR v IN CubeStates RETURN v._key')
            return set(cursor)
        except Exception as e:
            logger.error(f"Failed to load known states: {e}")
            return set()

    def save_state(self, state_hash: str, is_solved: bool):
        """Save a cube state as a vertex, using cache to skip if already exists."""
        if state_hash in self.known_states:
            return

        doc = {'_key': state_hash, 'is_solved': is_solved}
        try:
            self.states.insert(doc)
            self.known_states.add(state_hash)
        except Exception as e:
            if "unique constraint violated" not in str(e).lower():
                raise e
            else:
                self.known_states.add(state_hash)

    def save_transition(self, from_hash: str, to_hash: str, move: str):
        """Save a move as a directed edge between two states."""
        edge = {
            '_from': f'CubeStates/{from_hash}',
            '_to': f'CubeStates/{to_hash}',
            'move': move
        }
        try:
            # Note: We don't cache edges as they are more numerous, 
            # but we could use a composite key if needed.
            self.transitions.insert(edge)
        except Exception as e:
            pass

    def expand_node(self, current_state, depth=1):
        """BFS expansion with bulk insertion for massive performance gains."""
        queue = [(current_state, 0)]
        visited_in_batch = set()
        
        states_to_insert = []
        transitions_to_insert = []
        
        # Helper to avoid duplicates in the same batch
        local_known = self.known_states.copy()

        while queue:
            state, current_depth = queue.pop(0)
            state_hash = state.get_hash()
            
            if state_hash not in local_known:
                states_to_insert.append({'_key': state_hash, 'is_solved': state.is_solved()})
                local_known.add(state_hash)
            
            if current_depth < depth:
                from src.cube_engine import MOVES
                for move in MOVES.keys():
                    next_state = state.apply_move(move)
                    next_hash = next_state.get_hash()
                    
                    # Add transition
                    transitions_to_insert.append({
                        '_from': f'CubeStates/{state_hash}',
                        '_to': f'CubeStates/{next_hash}',
                        'move': move
                    })
                    
                    if next_hash not in local_known:
                        # We don't add to states_to_insert yet, it will be added when popped from queue
                        # or we can add it here to be safe
                        states_to_insert.append({'_key': next_hash, 'is_solved': next_state.is_solved()})
                        local_known.add(next_hash)
                        queue.append((next_state, current_depth + 1))

        # Bulk Insert
        if states_to_insert:
            try:
                # ignore_duplicates=True allows us to be less strict with local_known
                self.states.import_bulk(states_to_insert, halt_on_error=False)
                self.known_states.update(local_known)
                logger.info(f"Bulk inserted {len(states_to_insert)} states.")
            except Exception as e:
                logger.error(f"Bulk state insertion failed: {e}")

        if transitions_to_insert:
            try:
                self.transitions.import_bulk(transitions_to_insert, halt_on_error=False)
                logger.info(f"Bulk inserted {len(transitions_to_insert)} transitions.")
            except Exception as e:
                logger.error(f"Bulk transition insertion failed: {e}")

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