import sys, os
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath('.'))
load_dotenv('.env')

from app import create_app
from app.extensions import db
from app.models.ref_asset import RefAsset
from app.models.ref_threat import RefThreat
from app.models.control import Control

app = create_app()

def run_audit():
    with app.app_context():
        # 1. FIX ASSETS MISSING ASIL
        assets = RefAsset.query.filter(RefAsset.asil_level == None).all()
        fixed_asil = 0
        for a in assets:
            cat = a.category
            if cat == 'Safety-Critical': a.asil_level = 'D'
            elif cat == 'Powertrain': a.asil_level = 'C' # General powertrain
            elif cat == 'Chassis': a.asil_level = 'D'
            elif cat == 'Gateway': a.asil_level = 'B'
            elif cat == 'Connectivity': a.asil_level = 'A'
            elif cat == 'Perception': a.asil_level = 'B'
            elif cat == 'Body': a.asil_level = 'A'
            elif cat == 'Infotainment': a.asil_level = 'QM' # Will save as None if QM? Let's use 'A' or None. We can just leave Infotainment/Cloud as None.
            
            # If Cloud or External, None is correct.
            if cat in ['Cloud', 'External']:
                a.asil_level = None
            elif cat == 'Infotainment':
                a.asil_level = None
            else:
                if not a.asil_level:
                    a.asil_level = 'B' # Safe default for missing ASIL inside the vehicle
                
            if a.asil_level:
                fixed_asil += 1

        # 2. CHECK REF_THREATS
        threats = RefThreat.query.all()
        fixed_threats = 0
        for t in threats:
            changed = False
            if not t.stride_category:
                t.stride_category = "Elevation of Privilege" # safe fallback
                changed = True
            if t.default_feasibility is None:
                t.default_feasibility = 3
                changed = True
            if t.default_impact_safety is None: t.default_impact_safety = 2; changed = True
            if t.default_impact_financial is None: t.default_impact_financial = 2; changed = True
            if t.default_impact_operational is None: t.default_impact_operational = 2; changed = True
            if t.default_impact_privacy is None: t.default_impact_privacy = 2; changed = True
            if changed: fixed_threats += 1
            
        # 3. CHECK CONTROLS
        controls = Control.query.all()
        fixed_controls = 0
        for c in controls:
            changed = False
            if not c.applies_to_stride:
                c.applies_to_stride = ["Tampering"]
                changed = True
            if not c.applies_to_protocols:
                c.applies_to_protocols = ["Any"]
                changed = True
            if not c.reduction_target:
                c.reduction_target = "Feasibility"
                changed = True
            if c.reduction_value is None:
                c.reduction_value = 1
                changed = True
            if changed: fixed_controls += 1

        db.session.commit()
        print(f"Audit completed.")
        print(f"Fixed missing ASIL on {fixed_asil} assets.")
        print(f"Fixed {fixed_threats} threats missing data.")
        print(f"Fixed {fixed_controls} controls missing data.")

if __name__ == "__main__":
    run_audit()
