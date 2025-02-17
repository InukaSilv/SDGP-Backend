const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5001;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 📍 1. Get Coordinates of a University
app.get("/api/university", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "University name required" });

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${name}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const location = response.data.results[0]?.geometry.location;
    if (!location) return res.status(404).json({ error: "University not found" });

    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏨 2. Get Nearby Hostels
app.get("/api/nearby-hostels", async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Latitude and longitude required" });

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius || 5000}&type=lodging&key=${GOOGLE_MAPS_API_KEY}`
    );

    const hostels = response.data.results.map((place) => ({
      name: place.name,
      location: place.geometry.location,
      rating: place.rating || "No rating",
      address: place.vicinity,
    }));

    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🌎 3. Search for a Hostel by Name
app.get("/api/search-hostel", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Hostel name required" });

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${name}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const hostels = response.data.results.map((place) => ({
      name: place.name,
      location: place.geometry.location,
      rating: place.rating || "No rating",
      address: place.formatted_address,
    }));

    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
