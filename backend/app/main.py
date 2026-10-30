import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .routes import (
    materials,
    compare,
    recommendations,
    products,
    operations,
    suppliers,
    cost_optimizer,
    overview,
    settings
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Auto seed database if empty
with SessionLocal() as db:
    seed_database(db)

app = FastAPI(
    title="Shoes Wise - Footwear Material & Cost Optimization Platform API",
    version="1.0.0",
    description="Production-grade API for Footwear Material Specifications, Alternative Recommendation Engine, Construction Sequence Costing and Cost Optimization."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api
app.include_router(overview.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(cost_optimizer.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Shoes Wise Backend",
        "version": "1.0.0"
    }

# Mount Frontend static files if built
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
