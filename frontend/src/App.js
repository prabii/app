import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Calendar, MapPin, DollarSign, Clock, Sparkles, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [tripData, setTripData] = useState({
    destination: '',
    budget: '',
    duration_days: '',
    start_date: '',
    interests: [],
    travel_style: 'balanced'
  });

  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState(null);

  const interestOptions = [
    'Adventure', 'Culture', 'Food', 'History', 'Nature', 'Photography', 
    'Shopping', 'Nightlife', 'Art', 'Architecture', 'Museums', 'Beaches',
    'Mountains', 'Local Experiences', 'Wellness', 'Wildlife'
  ];

  const travelStyles = [
    { value: 'budget', label: 'Budget Explorer' },
    { value: 'balanced', label: 'Balanced Traveler' },
    { value: 'luxury', label: 'Luxury Seeker' },
    { value: 'adventure', label: 'Adventure Seeker' },
    { value: 'cultural', label: 'Culture Enthusiast' }
  ];

  const handleInputChange = (field, value) => {
    setTripData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest) => {
    setTripData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const generateItinerary = async () => {
    if (!tripData.destination || !tripData.budget || !tripData.duration_days || !tripData.start_date) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/generate-itinerary`, {
        ...tripData,
        budget: parseInt(tripData.budget),
        duration_days: parseInt(tripData.duration_days)
      });
      
      setGeneratedItinerary(response.data);
      
      // Get weather info
      try {
        const weatherResponse = await axios.get(`${API}/weather/${encodeURIComponent(tripData.destination)}?date=${tripData.start_date}`);
        setWeatherInfo(weatherResponse.data);
      } catch (weatherError) {
        console.error('Weather fetch failed:', weatherError);
      }
      
    } catch (error) {
      console.error('Error generating itinerary:', error);
      alert('Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTripData({
      destination: '',
      budget: '',
      duration_days: '',
      start_date: '',
      interests: [],
      travel_style: 'balanced'
    });
    setGeneratedItinerary(null);
    setWeatherInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522506209496-4536d9020ec4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHx3YW5kZXJsdXN0fGVufDB8fHx8MTc1ODQ3MzY3OHww&ixlib=rb-4.1.0&q=85')`
          }}
        />
        <div className="relative z-10 container mx-auto px-4 py-16 text-center">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">WanderWise</h1>
          </div>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Your AI-powered travel companion that creates personalized itineraries tailored to your dreams, budget, and style.
          </p>
          {!generatedItinerary && (
            <div className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-full text-lg font-medium shadow-lg hover:bg-indigo-700 transition-colors">
              <MapPin className="h-5 w-5 mr-2" />
              Plan Your Next Adventure
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {!generatedItinerary ? (
          /* Trip Planning Form */
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl text-gray-900 mb-2">Plan Your Perfect Trip</CardTitle>
                <p className="text-gray-600">Tell us about your travel dreams and we'll craft the perfect itinerary</p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Destination & Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                      Destination
                    </label>
                    <Input
                      placeholder="Where do you want to go?"
                      value={tripData.destination}
                      onChange={(e) => handleInputChange('destination', e.target.value)}
                      className="h-12 border-gray-200 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-indigo-600" />
                      Budget (USD)
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter your budget"
                      value={tripData.budget}
                      onChange={(e) => handleInputChange('budget', e.target.value)}
                      className="h-12 border-gray-200 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                      Duration (Days)
                    </label>
                    <Input
                      type="number"
                      placeholder="How many days?"
                      value={tripData.duration_days}
                      onChange={(e) => handleInputChange('duration_days', e.target.value)}
                      className="h-12 border-gray-200 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={tripData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className="h-12 border-gray-200 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Travel Style */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Travel Style</label>
                  <Select value={tripData.travel_style} onValueChange={(value) => handleInputChange('travel_style', value)}>
                    <SelectTrigger className="h-12 border-gray-200 focus:border-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {travelStyles.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Interests */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Your Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map(interest => (
                      <Badge
                        key={interest}
                        variant={tripData.interests.includes(interest) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          tripData.interests.includes(interest) 
                            ? 'bg-indigo-600 hover:bg-indigo-700' 
                            : 'hover:bg-indigo-50 hover:border-indigo-300'
                        }`}
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-6">
                  <Button
                    onClick={generateItinerary}
                    disabled={isLoading}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium transition-all hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creating Your Perfect Itinerary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate My Trip Itinerary
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Generated Itinerary Display */
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Perfect Trip to {generatedItinerary.destination}</h2>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{generatedItinerary.duration_days} days</span>
                <span className="flex items-center"><DollarSign className="h-4 w-4 mr-1" />${generatedItinerary.budget}</span>
                <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />Starting {generatedItinerary.start_date}</span>
              </div>
            </div>

            {/* Weather Info */}
            {weatherInfo && (
              <Card className="bg-sky-50 border-sky-200">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-800">Weather Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-sky-900">{weatherInfo.weather_description}</p>
                      <p className="text-sky-700">{weatherInfo.temperature}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sky-700">{weatherInfo.recommendations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Budget Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(generatedItinerary.estimated_costs).map(([category, cost]) => (
                    <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 capitalize">{category}</p>
                      <p className="text-xl font-bold text-gray-900">${cost}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Itinerary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Your Personalized Itinerary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-indigo max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {generatedItinerary.itinerary}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Personalized Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{generatedItinerary.recommendations}</p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                onClick={resetForm}
                variant="outline"
                className="px-8 py-3 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                Plan Another Trip
              </Button>
              <Button
                onClick={() => window.print()}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700"
              >
                Save This Itinerary
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;