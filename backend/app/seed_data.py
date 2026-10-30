from sqlalchemy.orm import Session
from .models import AppSetting

def seed_database(db: Session):
    """
    Initialize base system settings only.
    No preloaded materials, products, suppliers, or operations.
    Data is created and managed directly by the user.
    """
    existing_settings = db.query(AppSetting).first()
    if existing_settings:
        return

    settings = [
        AppSetting(key="default_currency", value="INR", description="Default operational currency for bill of materials"),
        AppSetting(key="currency_symbol", value="₹", description="Currency symbol displayed in user interface"),
        AppSetting(key="factory_overhead_rate_pct", value="10.0", description="Factory overhead percentage applied over direct prime cost"),
        AppSetting(key="default_tooling_amortization", value="120.00", description="Last and mold tooling amortization cost per pair in Rupees"),
        AppSetting(key="default_packaging_cost", value="95.00", description="Inner box, tissue, silica gel and carton packaging per pair in Rupees"),
        AppSetting(key="default_qc_inspection_cost", value="50.00", description="AQL 2.5 final QA audit cost per pair in Rupees")
    ]
    for st in settings:
        db.add(st)
    db.commit()
    print("Base system configuration initialized. No preloaded data; database is user-driven.")
