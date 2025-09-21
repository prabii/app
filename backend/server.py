from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic models
class TripRequest(BaseModel):
    destination: str
    budget: int
    duration_days: int
    start_date: str
    interests: List[str]
    travel_style: str = "balanced"

class TripItinerary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    destination: str
    budget: int
    duration_days: int
    start_date: str
    interests: List[str]
    travel_style: str
    itinerary: str
    recommendations: str
    estimated_costs: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeatherInfo(BaseModel):
    destination: str
    date: str
    weather_description: str
    temperature: str
    recommendations: str

# AI Integration
async def generate_trip_itinerary(trip_request: TripRequest) -> dict:
    """Generate a personalized trip itinerary using AI"""
    try:
        # Import here to avoid issues if the package isn't installed
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Initialize chat with Gemini
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"trip-{uuid.uuid4()}",
            system_message="""You are WanderWise, an expert travel planner AI. Create detailed, personalized trip itineraries based on user preferences. Always provide:
1. Day-by-day detailed itinerary
2. Budget breakdown with estimated costs
3. Personalized recommendations based on interests
4. Practical travel tips
5. Must-visit attractions and hidden gems

Format your response as a comprehensive travel guide that's exciting and informative."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create the prompt
        interests_str = ", ".join(trip_request.interests)
        prompt = f"""Create a detailed {trip_request.duration_days}-day trip itinerary for {trip_request.destination} with the following specifications:

🎯 TRIP DETAILS:
- Destination: {trip_request.destination}
- Duration: {trip_request.duration_days} days
- Budget: ${trip_request.budget} USD
- Start Date: {trip_request.start_date}
- Interests: {interests_str}
- Travel Style: {trip_request.travel_style}

📋 REQUIREMENTS:
Create a comprehensive itinerary including:
1. Day-by-day schedule with specific activities
2. Recommended accommodations within budget
3. Transportation suggestions
4. Food recommendations (local specialties)
5. Budget breakdown (accommodation, food, activities, transport)
6. Weather considerations and packing tips
7. Cultural insights and local customs
8. Emergency contacts and useful phrases

Make it exciting, practical, and perfectly tailored to their interests!"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse budget information (simplified for MVP)
        estimated_costs = {
            "accommodation": round(trip_request.budget * 0.4),
            "food": round(trip_request.budget * 0.3),
            "activities": round(trip_request.budget * 0.2),
            "transport": round(trip_request.budget * 0.1)
        }
        
        return {
            "itinerary": response,
            "recommendations": f"Based on your interests in {interests_str}, this itinerary is crafted to maximize your {trip_request.travel_style} travel experience.",
            "estimated_costs": estimated_costs
        }
        
    except Exception as e:
        logging.error(f"Error generating itinerary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate itinerary: {str(e)}")

async def get_weather_info(destination: str, date: str) -> dict:
    """Get weather information for the destination (mock data for MVP)"""
    # For MVP, return mock weather data
    # In production, integrate with actual weather API
    mock_weather = {
        "weather_description": "Partly cloudy with mild temperatures",
        "temperature": "22-28°C (72-82°F)",
        "recommendations": "Pack light layers and a light jacket for evenings. Don't forget sunscreen!"
    }
    return mock_weather

# API Routes
@api_router.get("/")
async def root():
    return {"message": "WanderWise API - Your AI Travel Companion"}

@api_router.post("/generate-itinerary", response_model=TripItinerary)
async def create_trip_itinerary(trip_request: TripRequest):
    """Generate a personalized trip itinerary"""
    try:
        # Generate AI itinerary
        ai_response = await generate_trip_itinerary(trip_request)
        
        # Create trip itinerary object
        trip_itinerary = TripItinerary(
            destination=trip_request.destination,
            budget=trip_request.budget,
            duration_days=trip_request.duration_days,
            start_date=trip_request.start_date,
            interests=trip_request.interests,
            travel_style=trip_request.travel_style,
            itinerary=ai_response["itinerary"],
            recommendations=ai_response["recommendations"],
            estimated_costs=ai_response["estimated_costs"]
        )
        
        # Save to database
        trip_dict = trip_itinerary.dict()
        # Convert datetime to ISO string for MongoDB
        if isinstance(trip_dict.get('created_at'), datetime):
            trip_dict['created_at'] = trip_dict['created_at'].isoformat()
            
        await db.trip_itineraries.insert_one(trip_dict)
        
        return trip_itinerary
        
    except Exception as e:
        logging.error(f"Error creating trip itinerary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/weather/{destination}")
async def get_weather(destination: str, date: Optional[str] = None):
    """Get weather information for a destination"""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    weather_data = await get_weather_info(destination, date)
    
    return WeatherInfo(
        destination=destination,
        date=date,
        **weather_data
    )

@api_router.get("/trips", response_model=List[TripItinerary])
async def get_all_trips():
    """Get all created trip itineraries"""
    try:
        trips = await db.trip_itineraries.find().to_list(100)
        result = []
        for trip in trips:
            # Parse datetime from ISO string if needed
            if isinstance(trip.get('created_at'), str):
                try:
                    trip['created_at'] = datetime.fromisoformat(trip['created_at'].replace('Z', '+00:00'))
                except:
                    trip['created_at'] = datetime.now(timezone.utc)
            result.append(TripItinerary(**trip))
        return result
    except Exception as e:
        logging.error(f"Error fetching trips: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown") 
async def shutdown_db_client():
    client.close()