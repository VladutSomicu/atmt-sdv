from .graph_parser import GraphParser
from .rule_engine import RuleEngine
from .scoring import ScoringEngine
from .capec_mapper import CapecMapper


class ThreatEngine:
    """
    Main orchestrator for TARA threat analysis.
    Takes graph_json + vehicle_profile, returns a list of
    identified threats with baseline scores.
    """

    def __init__(self):
        self.parser = GraphParser()
        self.rules = RuleEngine()
        self.scoring = ScoringEngine()
        self.mapper = CapecMapper()

    def analyze(self, graph_json: dict, vehicle_profile: dict) -> list:
        """
        Run the complete analysis pipeline:
        1. Parse graph_json into nodes, edges, trust boundaries
        2. Apply STRIDE rules to identify threats
        3. Deduplicate threats on same node with same title
        4. Compute baseline SFOP + Feasibility scores
        5. Enrich with CAPEC/UNECE descriptions from DB
        """
        # Step 1: Parse
        nodes, edges, trust_boundaries = self.parser.parse(graph_json)

        # Step 2: Apply rules
        raw_threats = self.rules.apply(nodes, edges, trust_boundaries, vehicle_profile)

        # Step 3: Deduplicate
        unique_threats = self._deduplicate(raw_threats)

        # Step 4: Score
        scored_threats = self.scoring.compute(unique_threats, nodes, vehicle_profile)

        # Step 5: Enrich
        enriched_threats = self.mapper.enrich(scored_threats)

        return enriched_threats

    def _deduplicate(self, threats: list) -> list:
        """
        Remove duplicate threats: same title on the same node.
        Different titles on the same node are kept (separate threats).
        Same title on different nodes are kept (separate instances).
        """
        seen = set()
        result = []
        for t in threats:
            key = (t['asset_id'], t['threat_title'])
            if key not in seen:
                seen.add(key)
                result.append(t)
        return result