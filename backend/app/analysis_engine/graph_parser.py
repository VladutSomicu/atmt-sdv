class GraphParser:
    """
    Transforms raw graph_json into Python data structures
    that the RuleEngine can process.
    """

    def parse(self, graph_json: dict):
        """
        Returns: (nodes_dict, edges_list, trust_boundaries_list)
        - nodes_dict: {node_id: node_data}
        - edges_list: [edge_data, ...]
        - trust_boundaries_list: [tb_data, ...]
        """
        nodes = {n['id']: n for n in graph_json.get('nodes', [])}
        edges = graph_json.get('edges', [])
        trust_boundaries = graph_json.get('trust_boundaries', [])

        # Mark which trust boundary each node belongs to
        for tb in trust_boundaries:
            for node_id in tb.get('contains_node_ids', []):
                if node_id in nodes:
                    nodes[node_id]['in_trust_boundary'] = tb['id']

        return nodes, edges, trust_boundaries