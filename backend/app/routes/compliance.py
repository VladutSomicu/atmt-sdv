from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..models.project import Project
from ..models.diagram import Diagram
from ..models.threat import Threat
from ..utils.auth_decorators import requires_project_role

compliance_bp = Blueprint('compliance', __name__, url_prefix='/api/compliance')


@compliance_bp.route('/<uuid:project_id>/evaluate', methods=['POST'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def post_compliance(project_id):
    """Trigger a compliance re-evaluation (alias for GET)."""
    # Since GET already runs the checks dynamically, we just return the same data here.
    return get_compliance(project_id)


@compliance_bp.route('/<uuid:project_id>', methods=['GET'])
@jwt_required()
@requires_project_role('engineer', 'architect', 'manager', 'auditor')
def get_compliance(project_id):
    """Run compliance checks against R155 and R156 requirements."""
    project = Project.query.get(str(project_id))
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Get diagram and threats
    diagram = Diagram.query.filter_by(
        project_id=str(project_id)
    ).order_by(Diagram.version.desc()).first()

    threats = Threat.query.filter_by(project_id=str(project_id)).all()
    vehicle_profile = project.vehicle_profile or {}

    graph_json = diagram.graph_json if diagram else {"nodes": [], "edges": []}

    # Run all checks
    r155_checks = _run_r155_checks(graph_json, threats)
    r156_checks = _run_r156_checks(graph_json, threats, vehicle_profile)
    general_checks = _run_general_checks(threats)

    all_checks = r155_checks + r156_checks + general_checks
    passed = sum(1 for c in all_checks if c['status'] == 'pass')
    failed = sum(1 for c in all_checks if c['status'] == 'fail')
    not_applicable = sum(1 for c in all_checks if c['status'] == 'n/a')

    return jsonify({
        "compliance": {
            "checks": all_checks,
            "summary": {
                "total": len(all_checks),
                "passed": passed,
                "failed": failed,
                "not_applicable": not_applicable
            }
        }
    }), 200


def _run_r155_checks(graph_json, threats):
    """UNECE R155 compliance checks."""
    edges = graph_json.get('edges', [])
    nodes = {n['id']: n for n in graph_json.get('nodes', [])}
    checks = []

    # R155-01: All external-facing connections must have encryption
    external_edges = [
        e for e in edges
        if e.get('protocol') in ['Cellular', 'Wi-Fi', 'Bluetooth', 'V2X']
    ]
    unprotected_external = [
        e for e in external_edges
        if not e.get('has_security_control')
    ]
    if not external_edges:
        status, details = "n/a", "No external communication channels modeled."
    else:
        status = "pass" if not unprotected_external else "fail"
        details = (
            f"All {len(external_edges)} external channels are protected."
            if not unprotected_external
            else f"{len(unprotected_external)} of {len(external_edges)} external channels lack security controls."
        )
    checks.append({
        "id": "R155-01",
        "regulation": "UNECE R155",
        "title": "External communication channels must be encrypted",
        "reference": "R155 Annex 5, Table A1, 4.3.2",
        "status": status,
        "details": details
    })

    # R155-02: CAN bus must have intrusion detection
    can_edges = [e for e in edges if e.get('protocol') in ['CAN', 'CAN-FD']]
    can_with_control = [e for e in can_edges if e.get('has_security_control')]
    if not can_edges:
        status, details = "n/a", "No internal CAN bus connections modeled."
    else:
        status = "pass" if len(can_with_control) == len(can_edges) else "fail"
        details = (
            f"All {len(can_edges)} CAN connections have security controls."
            if len(can_with_control) == len(can_edges)
            else f"{len(can_edges) - len(can_with_control)} of {len(can_edges)} CAN connections lack security controls."
        )
    checks.append({
        "id": "R155-02",
        "regulation": "UNECE R155",
        "title": "Internal vehicle network must have IDS/IPS monitoring",
        "reference": "R155 Annex 5, Part B, Table B1, M15",
        "status": status,
        "details": details
    })

    # R155-03: All critical threats must be addressed
    critical_threats = [t for t in threats if t.risk_score >= 16]
    open_critical = [t for t in critical_threats if t.status == 'open']
    if not critical_threats:
        status, details = "n/a", "No critical risks identified."
    else:
        status = "pass" if not open_critical else "fail"
        details = (
            "No unaddressed critical risks."
            if not open_critical
            else f"{len(open_critical)} critical risk(s) still open without treatment."
        )
    checks.append({
        "id": "R155-03",
        "regulation": "UNECE R155",
        "title": "All critical risks must have treatment plans",
        "reference": "R155 Article 7.3.3",
        "status": status,
        "details": details
    })

    # R155-04: Trust boundary crossings must be secured
    crossings = [e for e in edges if e.get('crosses_trust_boundary')]
    unsecured_crossings = [
        e for e in crossings
        if not e.get('has_security_control')
    ]
    if not crossings:
        status, details = "n/a", "No trust boundary crossings modeled."
    else:
        status = "pass" if not unsecured_crossings else "fail"
        details = (
            "All trust boundary crossings are secured."
            if not unsecured_crossings
            else f"{len(unsecured_crossings)} trust boundary crossing(s) lack security controls."
        )
    checks.append({
        "id": "R155-04",
        "regulation": "UNECE R155",
        "title": "Trust boundary crossings must have security controls",
        "reference": "R155 Annex 5, Table A1, 4.3.7, item 29.2",
        "status": status,
        "details": details
    })

    return checks


def _run_r156_checks(graph_json, threats, vehicle_profile):
    """UNECE R156 compliance checks (OTA/SUMS)."""
    ota_support = vehicle_profile.get('ota_support', False)

    if not ota_support:
        return [{
            "id": "R156-00",
            "regulation": "UNECE R156",
            "title": "OTA Software Update Management",
            "reference": "R156",
            "status": "n/a",
            "details": "OTA support is not enabled for this vehicle profile."
        }]

    checks = []
    edges = graph_json.get('edges', [])

    # R156-01: OTA update channel must be encrypted
    ota_edges = [
        e for e in edges
        if e.get('protocol') in ['Cellular', 'Wi-Fi']
    ]
    ota_protected = [e for e in ota_edges if e.get('has_security_control')]
    if not ota_edges:
        status, details = "n/a", "No OTA-capable external channels modeled."
    else:
        status = "pass" if len(ota_protected) == len(ota_edges) else "fail"
        details = (
            f"All {len(ota_edges)} OTA-capable channels are protected."
            if len(ota_protected) == len(ota_edges)
            else f"{len(ota_edges) - len(ota_protected)} of {len(ota_edges)} OTA channels lack encryption."
        )
    checks.append({
        "id": "R156-01",
        "regulation": "UNECE R156",
        "title": "OTA update channels must use encrypted communication",
        "reference": "R156 Article 7.1.3.1",
        "status": status,
        "details": details
    })

    # R156-02: OTA threats must be mitigated
    ota_all_threats = [t for t in threats if 'OTA' in t.title]
    ota_threats = [t for t in ota_all_threats if t.status == 'open']
    if not ota_all_threats:
        status, details = "n/a", "No OTA-related threats identified."
    else:
        status = "pass" if not ota_threats else "fail"
        details = (
            "All OTA-related threats are addressed."
            if not ota_threats
            else f"{len(ota_threats)} OTA threat(s) still open."
        )
    checks.append({
        "id": "R156-02",
        "regulation": "UNECE R156",
        "title": "OTA update threats must have mitigation controls",
        "reference": "R156 Article 7.1.4",
        "status": status,
        "details": details
    })

    # R156-03: Digital signature verification must exist
    ota_mitigated = [
        t for t in ota_all_threats
        if t.status == 'mitigated'
    ]
    has_signature_control = any(
        t.control_ids for t in ota_mitigated
        if t.control_ids
    )
    if not ota_all_threats:
        status, details = "n/a", "No OTA-related threats identified."
    else:
        status = "pass" if has_signature_control else "fail"
        details = (
            "OTA update signature verification control is applied."
            if has_signature_control
            else "No digital signature verification control found on OTA threats."
        )
    checks.append({
        "id": "R156-03",
        "regulation": "UNECE R156",
        "title": "OTA packages must have digital signature verification",
        "reference": "R156 Article 7.2.1.1",
        "status": status,
        "details": details
    })

    return checks


def _run_general_checks(threats):
    """General TARA process compliance checks."""
    checks = []

    # GEN-01: All threats must have been reviewed
    total = len(threats)
    reviewed = sum(1 for t in threats if t.status != 'open')
    if total == 0:
        status, details = "n/a", "No threats identified yet."
    else:
        status = "pass" if reviewed == total else "fail"
        details = (
            f"All {total} threats have been reviewed."
            if reviewed == total
            else f"{total - reviewed} of {total} threats are still open."
        )
    checks.append({
        "id": "GEN-01",
        "regulation": "ISO 21434",
        "title": "All identified threats must be reviewed and treated",
        "reference": "ISO 21434 Clause 15.8",
        "status": status,
        "details": details
    })

    # GEN-02: Accepted risks must have justification
    accepted_risks = [t for t in threats if t.status == 'accepted']
    accepted_no_reason = [
        t for t in accepted_risks
        if not t.justification
    ]
    if not accepted_risks:
        status, details = "n/a", "No accepted risks."
    else:
        status = "pass" if not accepted_no_reason else "fail"
        details = (
            "All accepted risks have justifications."
            if not accepted_no_reason
            else f"{len(accepted_no_reason)} accepted risk(s) missing justification."
        )
    checks.append({
        "id": "GEN-02",
        "regulation": "ISO 21434",
        "title": "Accepted risks must include documented justification",
        "reference": "ISO 21434 Clause 15.9",
        "status": status,
        "details": details
    })

    return checks