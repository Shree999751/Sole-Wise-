from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(AppSetting).all()
    res = {}
    for s in settings:
        res[s.key] = s.value
    return res


@router.put("")
def update_settings(data: Dict[str, str], db: Session = Depends(get_db)):
    for key, value in data.items():
        st = db.query(AppSetting).filter(AppSetting.key == key).first()
        if st:
            st.value = str(value)
        else:
            db.add(AppSetting(key=key, value=str(value), description="User configured"))
    db.commit()
    return {"status": "success", "settings": data}
