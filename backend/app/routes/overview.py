import traceback
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models import Material, Supplier, Product, PriceHistory, CostingScenario

router = APIRouter(prefix="/overview", tags=["Overview"])

@router.get("")
def get_dashboard_overview(db: Session = Depends(get_db)):
    try:
        total_materials = db.query(Material).filter(Material.is_archived == False).count()
        total_suppliers = db.query(Supplier).count()
        total_products = db.query(Product).count()
        total_scenarios = db.query(CostingScenario).count()

        # Category counts
        cat_counts = (
            db.query(Material.category, func.count(Material.id))
            .filter(Material.is_archived == False)
            .group_by(Material.category)
            .all()
        )
        categories_breakdown = [{"category": c[0] or "Uncategorized", "count": c[1] or 0} for c in cat_counts]

        # Verification status breakdown
        status_counts = (
            db.query(Material.validation_status, func.count(Material.id))
            .filter(Material.is_archived == False)
            .group_by(Material.validation_status)
            .all()
        )
        validation_breakdown = [{"status": s[0] or "Unknown", "count": s[1] or 0} for s in status_counts]

        # Recent price changes
        recent_changes = (
            db.query(PriceHistory)
            .order_by(desc(PriceHistory.created_at))
            .limit(6)
            .all()
        )
        price_changes_data = []
        for ph in recent_changes:
            mat_name = ph.material.name if ph.material else f"Material #{ph.material_id}"
            price_changes_data.append({
                "id": ph.id,
                "material_id": ph.material_id,
                "material_name": mat_name,
                "price_per_unit": ph.price_per_unit or 0.0,
                "currency": ph.currency or "USD",
                "effective_date": ph.effective_date or "",
                "changed_by": ph.changed_by or "System",
                "reason": ph.reason or ""
            })

        # Saved optimization scenarios and potential savings
        scenarios = db.query(CostingScenario).all()
        total_potential_batch_savings = sum((s.batch_savings or 0.0) for s in scenarios)
        scenario_list = []
        for s in scenarios:
            p_name = s.product.name if s.product else f"Product #{s.product_id}"
            scenario_list.append({
                "id": s.id,
                "product_id": s.product_id,
                "product_name": p_name,
                "name": s.name or "Scenario",
                "savings_per_pair": s.savings_per_pair or 0.0,
                "savings_percentage": s.savings_percentage or 0.0,
                "batch_savings": s.batch_savings or 0.0
            })

        return {
            "metrics": {
                "total_materials": total_materials,
                "total_suppliers": total_suppliers,
                "total_products": total_products,
                "total_scenarios": total_scenarios,
                "total_potential_savings": round(total_potential_batch_savings, 2)
            },
            "categories_breakdown": categories_breakdown,
            "validation_breakdown": validation_breakdown,
            "recent_price_changes": price_changes_data,
            "active_scenarios": scenario_list
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "metrics": {
                "total_materials": 0,
                "total_suppliers": 0,
                "total_products": 0,
                "total_scenarios": 0,
                "total_potential_savings": 0.0
            },
            "categories_breakdown": [],
            "validation_breakdown": [],
            "recent_price_changes": [],
            "active_scenarios": [],
            "error": str(e)
        }
