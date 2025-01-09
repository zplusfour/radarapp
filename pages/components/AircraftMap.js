import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const AircraftMap = () => {
  const [aircrafts, setAircrafts] = useState([]);
  const [userLocation, setUserLocation] = useState(null); // To store user's location
  const [viewport, setViewport] = useState({
    center: [32.011398, 34.8867], // Default center
    zoom: 5,                     // Default zoom
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get user's location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setViewport({
            center: [latitude, longitude],
            zoom: 10, // Adjust zoom level based on preference
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
          // Fallback to default location if permission is denied
          setUserLocation(null); // No user location
          setViewport({
            center: [32.011398, 34.8867], // Default fallback center
            zoom: 5,
          });
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      // Fallback to default location if geolocation is not supported
      setUserLocation(null);
      setViewport({
        center: [32.011398, 34.8867], // Default fallback center
        zoom: 5,
      });
    }
  };

  useEffect(() => {
    getUserLocation(); // Call to get user's location when the component mounts
  }, []);

  const fetchAircraftData = async (lat, lon, zoom) => {
    const radius = Math.min((250 * zoom) / 10, 250); // Radius capped at 250nm
    try {
      const response = await axios.get(
        `https://corsproxy.io/https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`
      );
      setAircrafts(response.data.ac || []); // Update aircraft data
    } catch (error) {
      console.error('Error fetching aircraft data:', error);
    }
  };

  useEffect(() => {
    const { center, zoom } = viewport;
    // Fetch aircraft data on viewport change
    fetchAircraftData(center[0], center[1], zoom);
  }, [viewport]); // Dependency on viewport to refetch on changes

  const handleViewportChange = (map) => {
    const newCenter = map.getCenter();
    const newZoom = map.getZoom();

    setViewport({
      center: [newCenter.lat, newCenter.lng],
      zoom: newZoom,
    });
  };

  const createHeadingIcon = (heading) => {
    const L = require('leaflet');
    return L.divIcon({
      className: 'aircraft-icon',
      html: `<div style="transform: rotate(${heading}deg); width: 31; height: 31; display: flex; justify-content: center; align-items: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="31" height="31" fill="gray" class="bi bi-airplane-fill" viewBox="0 0 16 16">
  <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849"/>
</svg>
            </div>`,
      iconSize: [31, 31],
    });
  };

  if (!isClient) return null;

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MapContainer
        center={viewport.center}
        zoom={viewport.zoom}
        style={{ width: '100%', height: '100vh' }}
        whenCreated={(map) => {
          map.on('moveend', () => handleViewportChange(map));
          map.on('zoomend', () => handleViewportChange(map));
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* {userLocation && (
          <Marker position={userLocation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-circle-fill" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="8"/>
</svg>
          </Marker>
        )} */}

        {aircrafts.map((aircraft, index) => (
          <Marker
            key={index}
            position={[aircraft.lat, aircraft.lon]}
            icon={createHeadingIcon(aircraft.track)}
          >
            <Popup>
              <div>
                <h2>{aircraft.flight || 'Unknown'}</h2>
                <h3>{aircraft.t || 'N/A'}</h3>
                <hr/>
                <p>Altitude: {aircraft.alt_geom || 'N/A'}ft</p>
                <p>Speed: {aircraft.ias}kts</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default AircraftMap;
