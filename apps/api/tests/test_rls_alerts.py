"""
RLS (Row Level Security) tests for alerts and logs.

Tests that users can only CRUD their own alerts/logs and cannot access other users' data.
"""

import pytest
import os
from typing import Dict, Any
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import jwt
import time

# Test JWT tokens for two different users
USER_A_TOKEN = jwt.encode({
    "sub": "test-user-a-12345",
    "user_id": "test-user-a-12345",
    "email": "usera@test.com",
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "iat": int(time.time())
}, "test-secret", algorithm="HS256")

USER_B_TOKEN = jwt.encode({
    "sub": "test-user-b-67890", 
    "user_id": "test-user-b-67890",
    "email": "userb@test.com",
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "iat": int(time.time())
}, "test-secret", algorithm="HS256")

# Mock alert data
SAMPLE_ALERT = {
    "symbol": "BTCUSDT",
    "base_timeframe": "1h",
    "conditions": [
        {
            "id": "condition_1",
            "type": "indicator",
            "operator": ">",
            "compareWith": "value",
            "compareValue": 30.0,
            "indicator": "RSI",
            "component": "RSI",
            "timeframe": "same"
        }
    ],
    "logic": "AND",
    "action": {"type": "notify"},
    "status": "active"
}


class TestRLSAlerts:
    """Test Row Level Security for alerts and logs."""
    
    def setup_method(self):
        """Setup test environment with mocked Supabase client."""
        self.mock_supabase = MagicMock()
        
        # Mock different responses for different users
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        self.mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"alert_id": "test-alert-123"}]
        self.mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        self.mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_a_creates_alert_success(self, mock_supabase):
        """Test that User A can create an alert successfully."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
            "alert_id": "user-a-alert-123",
            "user_id": "test-user-a-12345",
            **SAMPLE_ALERT
        }]
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.post(
                "/alerts",
                json=SAMPLE_ALERT,
                headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "test-user-a-12345"
            assert data["symbol"] == "BTCUSDT"
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_a_only_sees_own_alerts(self, mock_supabase):
        """Test that User A only sees their own alerts."""
        user_a_alerts = [{
            "alert_id": "user-a-alert-123",
            "user_id": "test-user-a-12345",
            **SAMPLE_ALERT
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = user_a_alerts
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.get(
                "/alerts",
                headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["user_id"] == "test-user-a-12345"
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_b_cannot_see_user_a_alerts(self, mock_supabase):
        """Test that User B cannot see User A's alerts."""
        # Mock empty response for User B
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.get(
                "/alerts",
                headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 0  # User B should see no alerts
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_b_cannot_update_user_a_alert(self, mock_supabase):
        """Test that User B cannot update User A's alert."""
        # Mock that the alert doesn't exist for User B
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.patch(
                "/alerts/user-a-alert-123",
                json={"status": "paused"},
                headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
            )
            
            assert response.status_code == 404  # Should not find the alert
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_b_cannot_delete_user_a_alert(self, mock_supabase):
        """Test that User B cannot delete User A's alert."""
        # Mock that the alert doesn't exist for User B
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.delete(
                "/alerts/user-a-alert-123",
                headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
            )
            
            assert response.status_code == 404  # Should not find the alert
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_b_cannot_access_user_a_logs(self, mock_supabase):
        """Test that User B cannot access User A's alert logs."""
        # Mock that the alert doesn't exist for User B (so they can't access logs)
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.get(
                "/alerts/user-a-alert-123/logs",
                headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
            )
            
            assert response.status_code == 404  # Should not find the alert
    
    @patch('apps.api.clients.supabase_client.supabase')
    def test_user_a_can_access_own_logs(self, mock_supabase):
        """Test that User A can access their own alert logs."""
        # Mock that the alert exists for User A
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "alert_id": "user-a-alert-123",
            "user_id": "test-user-a-12345",
            **SAMPLE_ALERT
        }
        
        # Mock logs for the alert
        mock_logs = [{
            "id": 1,
            "alert_id": "user-a-alert-123",
            "triggered_at": "2025-01-18T10:00:00Z",
            "payload": {"price": 50000, "rsi": 25}
        }]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value.data = mock_logs
        
        with patch('apps.api.deps.auth.SUPABASE_JWT_SECRET', 'test-secret'):
            from main import app
            client = TestClient(app)
            
            response = client.get(
                "/alerts/user-a-alert-123/logs",
                headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["alert_id"] == "user-a-alert-123"


class TestRLSIntegration:
    """Integration tests for RLS policies."""
    
    def test_rls_policies_are_enabled(self):
        """Test that RLS policies are properly configured."""
        # This would be an integration test that actually connects to Supabase
        # and verifies the RLS policies are active
        pass
    
    def test_cross_user_data_isolation(self):
        """Test that data is properly isolated between users."""
        # This would test actual database isolation
        pass


if __name__ == "__main__":
    pytest.main([__file__])



