def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "codeviz-api"
    assert "status" in data
    assert "redis" in data
    assert "celery" in data

def test_status_404(client):
    response = client.get("/api/status/non-existent-id-12345")
    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"

def test_analyze_invalid_host(client):
    response = client.post("/api/analyze", json={"repo_url": "https://gitlab.com/user/repo", "branch": "main"})
    assert response.status_code == 400
    assert "Unsupported git host" in response.json()["detail"]
