import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.database import Base, engine

Base.metadata.create_all(bind=engine)


@pytest.mark.asyncio
async def test_register_and_login():
    ...
```//le reste ne change pas

## Ce que fait cette ligne

`Base.metadata.create_all(bind=engine)` dit à SQLAlchemy : "regarde tous les modèles que j'ai définis (`User`, `Order`), et crée les tables correspondantes dans la base de données connectée" — exactement ce qu'il faut faire une seule fois avant que les tests puissent fonctionner.

Sauvegarde, pousse sur la même branche :
```
cd ~/k8s-security-pipeline
git add backend/tests/test_auth.py
git commit -m "Create database tables before running tests"
git push
