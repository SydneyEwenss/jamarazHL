const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const NodeCache = require("node-cache");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Cache for storing album and track information (TTL 1 hour for this example)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Spotify token cache
let spotifyToken = null;

// Fetch Spotify token
async function fetchSpotifyToken() {
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `6b0e792e0bdc4ab3960715265056a250:8e69160dafff4ce0a6da3cd63c769618`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    spotifyToken = response.data.access_token;
    console.log('Spotify token fetched successfully.');
  } catch (error) {
    console.error('Error fetching Spotify token:', error.response?.data || error.message);
  }
}

// Refresh token every hour
fetchSpotifyToken();
setInterval(fetchSpotifyToken, 3600 * 1000);

// Function to get albums and tracks
async function getArtistTracksFromSpotify(artistId) {
  try {
    // Check cache first
    let cachedData = cache.get(artistId);
    if (cachedData) {
      console.log('Using cached data');
      return cachedData;
    }

    // Fetch artist's albums
    const albumsResponse = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}/albums`,
      { headers: { Authorization: `Bearer ${spotifyToken}` } }
    );

    const albums = albumsResponse.data.items;
    let allTracks = [];

    // Fetch tracks for each album
    for (const album of albums) {
      const tracksResponse = await axios.get(
        `https://api.spotify.com/v1/albums/${album.id}/tracks`,
        { headers: { Authorization: `Bearer ${spotifyToken}` } }
      );

      const tracks = tracksResponse.data.items.map((track) => {
        return {
          name: track.name,
          album: album.name,
          albumImage: album.images[0]?.url,
          duration: track.duration_ms, // Track duration in milliseconds
        };
      });

      allTracks = [...allTracks, ...tracks];
    }

    // Cache the response data for 1 hour
    cache.set(artistId, allTracks);

    return allTracks; // Return all tracks by the artist
  } catch (error) {
    console.error('Error fetching all tracks:', error.response?.data || error.message);
    throw error;
  }
}

app.get('/api/artist/:id/all-tracks', async (req, res) => {
  const { id } = req.params;

  try {
    const allTracks = await getArtistTracksFromSpotify(id);
    res.json(allTracks); // Return all tracks by the artist
  } catch (error) {
    res.status(500).send('Error fetching all tracks');
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
});
