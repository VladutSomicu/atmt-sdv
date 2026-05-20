from ..models.ref_threat import RefThreat


# Default scores by asset category when ref_threats has no match
CATEGORY_DEFAULTS = {
    # (safety, financial, operational, privacy, feasibility)
    'Safety-Critical': (4, 3, 4, 1, 2),
    'Connectivity':    (2, 3, 2, 3, 4),
    'Infotainment':    (1, 2, 2, 3, 3),
    'Powertrain':      (3, 3, 4, 1, 2),
    'Perception':      (3, 2, 3, 1, 3),
    'Diagnostic':      (3, 3, 3, 2, 2),
    'Cloud':           (2, 4, 3, 4, 5),
}


class ScoringEngine:
    """
    Computes baseline SFOP impact and feasibility scores for each threat.
    Scores come from ref_threats (DB) first, then category defaults,
    then contextual adjustments based on vehicle profile.
    """

    def compute(self, threats: list, nodes: dict, vehicle_profile: dict) -> list:
        sae_level = vehicle_profile.get('sae_level', 0)

        for t in threats:
            node = nodes.get(t['asset_id'], {})
            category = node.get('category', 'Connectivity')

            # Step 1: Try to get scores from ref_threats (DB)
            s, f, o, p, feasibility = self._get_ref_scores(t['threat_title'])

            # Step 2: If no ref_threat match, use category defaults
            if s is None:
                defaults = CATEGORY_DEFAULTS.get(category, (2, 2, 2, 2, 3))
                s, f, o, p, feasibility = defaults

            # Step 3: Apply contextual adjustments
            s, f, o, p, feasibility = self._apply_context(
                s, f, o, p, feasibility, node, vehicle_profile, sae_level
            )

            # Step 4: Store scores on threat dict
            t['baseline_impact_safety'] = s
            t['baseline_impact_financial'] = f
            t['baseline_impact_operational'] = o
            t['baseline_impact_privacy'] = p
            t['baseline_feasibility'] = feasibility
            t['baseline_risk_score'] = max(s, f, o, p) * feasibility

        return threats

    def _get_ref_scores(self, threat_title: str):
        """Look up default scores from ref_threats table by title match."""
        ref = RefThreat.query.filter(
            RefThreat.title.ilike(f'%{threat_title.split("(")[0].strip()}%')
        ).first()

        if ref and ref.default_feasibility:
            s = ref.default_impact_safety or 1
            f = ref.default_impact_financial or 1
            o = ref.default_impact_operational or 1
            p = ref.default_impact_privacy or 1
            return s, f, o, p, ref.default_feasibility

        return None, None, None, None, None

    def _apply_context(self, s, f, o, p, feasibility, node, vp, sae_level):
        """Apply vehicle profile and node-specific adjustments."""

        # SAE Level >= 3: Perception sensors get max Safety
        if node.get('category') == 'Perception' and sae_level >= 3:
            s = 4
            feasibility = max(feasibility, 4)

        # Cloud-connected nodes: max feasibility + high privacy
        if 'is_connected_to_cloud' in node.get('flags', []):
            feasibility = 5
            p = max(p, 3)

        # PII data: high privacy impact
        if 'PII' in node.get('data_types', []):
            p = max(p, 3)

        # OBD-II physical access: lower feasibility (requires physical presence)
        if node.get('physical_accessibility') == 'OBD-II':
            feasibility = min(feasibility, 2)

        # Safety-Critical: ensure Safety is never below 3
        if node.get('category') == 'Safety-Critical':
            s = max(s, 3)

        # EV propulsion with Powertrain: high safety (battery fire risk)
        if (node.get('category') == 'Powertrain' and
                vp.get('propulsion') in ['EV', 'Hybrid']):
            s = max(s, 4)

        # Clamp all values to valid ranges
        s = max(1, min(4, s))
        f = max(1, min(4, f))
        o = max(1, min(4, o))
        p = max(1, min(4, p))
        feasibility = max(1, min(5, feasibility))

        return s, f, o, p, feasibility