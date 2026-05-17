import pytest
from utils.api_client import APIClient
from utils.assertions import APIAssertions


@pytest.mark.api
class TestUsers:
    """Auto-generated tests cho endpoint: /users"""

    def test_get_all_users(self, api: APIClient):
        response = api.get("/users")
        APIAssertions.assert_ok(response)
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        APIAssertions.assert_response_time(response)

    def test_get_users_by_id(self, api: APIClient):
        response = api.get("/users/1")
        APIAssertions.assert_ok(response)
        data = response.json()
        APIAssertions.assert_has_fields(data, ["id", "name", "username", "email", "address", "phone", "website", "company"])
        assert data is not None

    def test_get_users_not_found(self, api: APIClient):
        response = api.get("/users/999999999")
        APIAssertions.assert_not_found(response)

    def test_create_users(self, api: APIClient):
        body = {
            "name": "test_name",
            "username": "test_username",
            "email": "test_email"
}
        response = api.post("/users", body=body)
        assert response.status_code in (200, 201), (
            f"Expected 200 or 201, got {response.status_code}"
        )
        data = response.json()
        assert data is not None

    def test_update_users(self, api: APIClient):
        body = {
            "name": "test_name",
            "username": "test_username",
            "email": "test_email"
}
        response = api.put("/users/1", body=body)
        APIAssertions.assert_ok(response)

    def test_delete_users(self, api: APIClient):
        response = api.delete("/users/1")
        assert response.status_code in (200, 204), (
            f"Expected 200 or 204, got {response.status_code}"
        )
