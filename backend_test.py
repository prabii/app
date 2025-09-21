import requests
import sys
import json
from datetime import datetime, timedelta

class WanderWiseAPITester:
    def __init__(self, base_url="https://journey-planner-114.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.generated_trip_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=60)  # Longer timeout for AI calls

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'POST' and 'id' in response_data:
                        self.generated_trip_id = response_data['id']
                        print(f"   Generated trip ID: {self.generated_trip_id}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Error text: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the root endpoint health check"""
        return self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )

    def test_generate_itinerary(self):
        """Test AI itinerary generation - the core feature"""
        # Use the exact test data from the request
        test_trip_data = {
            "destination": "Paris, France",
            "budget": 2000,
            "duration_days": 5,
            "start_date": "2025-03-01",
            "interests": ["Culture", "Food", "Art"],
            "travel_style": "balanced"
        }
        
        print(f"   Testing with data: {json.dumps(test_trip_data, indent=2)}")
        success, response = self.run_test(
            "Generate AI Itinerary (Core Feature)",
            "POST",
            "generate-itinerary",
            200,  # Should return 200, not 201 based on the code
            data=test_trip_data
        )
        
        if success and isinstance(response, dict):
            # Verify the response structure
            required_fields = ['id', 'destination', 'budget', 'duration_days', 'itinerary', 'estimated_costs']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields in response: {missing_fields}")
            else:
                print(f"   ✅ Response contains all required fields")
                print(f"   📝 Itinerary preview: {response.get('itinerary', '')[:200]}...")
                print(f"   💰 Budget breakdown: {response.get('estimated_costs', {})}")
        
        return success, response

    def test_weather_endpoint(self):
        """Test weather information endpoint"""
        return self.run_test(
            "Weather Information",
            "GET",
            "weather/Paris, France",
            200,
            params={"date": "2025-03-01"}
        )

    def test_get_all_trips(self):
        """Test retrieving all trips"""
        return self.run_test(
            "Get All Trips",
            "GET",
            "trips",
            200
        )

    def test_invalid_itinerary_request(self):
        """Test error handling with invalid data"""
        invalid_data = {
            "destination": "",  # Empty destination
            "budget": -100,     # Negative budget
            "duration_days": 0  # Zero days
        }
        
        success, response = self.run_test(
            "Invalid Itinerary Request (Error Handling)",
            "POST",
            "generate-itinerary",
            422,  # Validation error expected
            data=invalid_data
        )
        return success, response

def main():
    print("🚀 Starting WanderWise API Testing...")
    print("=" * 60)
    
    # Setup
    tester = WanderWiseAPITester()
    
    # Test 1: Health Check
    tester.test_health_check()
    
    # Test 2: Weather endpoint (should work with mock data)
    tester.test_weather_endpoint()
    
    # Test 3: Get all trips (should work even if empty)
    tester.test_get_all_trips()
    
    # Test 4: Core feature - AI itinerary generation
    print("\n" + "="*60)
    print("🧠 TESTING CORE AI FEATURE - This may take 30-60 seconds...")
    print("="*60)
    success, itinerary_response = tester.test_generate_itinerary()
    
    if success:
        print("\n🎉 AI Integration working! Generated itinerary successfully.")
        
        # Test 5: Get all trips again to see if the new trip was saved
        print("\n📋 Verifying trip was saved to database...")
        tester.test_get_all_trips()
    else:
        print("\n❌ AI Integration failed - this is the core feature!")
    
    # Test 6: Error handling
    tester.test_invalid_itinerary_request()
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed. Backend needs attention.")
        return 1

if __name__ == "__main__":
    sys.exit(main())