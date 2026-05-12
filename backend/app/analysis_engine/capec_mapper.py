from ..models.ref_threat import RefThreat


class CapecMapper:
    """
    Enriches threat dicts with full descriptions and references
    from the ref_threats table.
    """

    def enrich(self, threats: list) -> list:
        for t in threats:
            ref = self._find_ref_threat(t['threat_title'])

            if ref:
                t['ref_threat_id'] = str(ref.id)
                t['description'] = ref.description
                t['source'] = ref.source
                t['source_ref'] = ref.source_ref
            else:
                t['ref_threat_id'] = None
                t['description'] = None
                t['source'] = self._infer_source(t['threat_title'])
                t['source_ref'] = self._extract_ref(t['threat_title'])

        return threats

    def _find_ref_threat(self, threat_title: str):
        """Find matching ref_threat by title similarity."""
        # Try exact match first
        ref = RefThreat.query.filter_by(title=threat_title).first()
        if ref:
            return ref

        # Try partial match on the base title (before parentheses)
        base_title = threat_title.split('(')[0].strip()
        ref = RefThreat.query.filter(
            RefThreat.title.ilike(f'%{base_title}%')
        ).first()

        return ref

    def _infer_source(self, threat_title: str):
        """Infer the source from the threat title."""
        if 'CAPEC' in threat_title:
            return 'CAPEC'
        elif 'LINDDUN' in threat_title:
            return 'LINDDUN'
        elif 'UNECE' in threat_title or 'R155' in threat_title or 'R156' in threat_title:
            return 'UNECE_R155'
        elif 'ATT&CK' in threat_title:
            return 'MITRE_ATTACK'
        return 'STRIDE'

    def _extract_ref(self, threat_title: str):
        """Extract CAPEC/UNECE reference from parentheses in title."""
        if '(' in threat_title and ')' in threat_title:
            return threat_title.split('(')[1].split(')')[0]
        return None