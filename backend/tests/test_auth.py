import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.database import Base, engine

Base.metadata.create_all(bind=engine)


@pytest.mark.asyncio
async def test_register_and_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as client:
        register_response = await client.post(
            "/auth/register",
            json={"email": "pytest_user@test.com", "password": "motdepasse123"},
        )
        assert register_response.status_code == 200

        login_response = await client.post(
            "/auth/login",
            json={"email": "pytest_user@test.com", "password": "motdepasse123"},
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()


@pytest.mark.asyncio
async def test_login_wrong_password():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as client:
        response = await client.post(
            "/auth/login",
            json={"email": "pytest_user@test.com", "password": "mauvais_mot_de_passe"},
        )
        assert response.json()["message"] == "Invalid email or password"
