import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';


// Dynamically import the Leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const AircraftMap = () => {
  const [aircrafts, setAircrafts] = useState([]);
  const [viewport, setViewport] = useState({
    center: [51.505, -0.09], // Initial map center (London, for example)
    zoom: 5,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true once the component has mounted (client-side only)
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Fetch aircraft data based on current map center and radius
    const fetchData = async () => {
      const { center, zoom } = viewport;
      const radius = 250 * (zoom / 10); // Adjust radius based on zoom level (just an example)
      // const { lat, lng } = center;

      try {
        const response = await axios.get(`https://api.adsb.lol/v2/point/${center[0]}/${center[1]}/${radius}`);
        console.log(response);
        setAircrafts(response.data.ac);
      } catch (error) {
        console.error('Error fetching aircraft data:', error);
      }
    };

    fetchData();
  }, [viewport]);

  // Handle map movements to adjust the viewport state
  const handleViewportChange = (map) => {
    const newCenter = map.getCenter();
    const newZoom = map.getZoom();
    setViewport({ center: [newCenter.lat, newCenter.lng], zoom: newZoom });
  };

  // Function to create a rotated marker icon based on the aircraft heading (track)
  const createHeadingIcon = (heading) => {
    const L = require('leaflet');
    const icon = L.divIcon({
      className: 'aircraft-icon',
      html: `<div style="transform: rotate(${heading}deg); width: 20px; height: 20px; background: red; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></div>`,
      iconSize: [20, 20],
    });
    return icon;
  };

  // Don't render map until we are on the client
  if (!isClient) {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MapContainer
        center={viewport.center}
        zoom={viewport.zoom}
        style={{ width: '100%', height: '100vh' }}
        whenCreated={(map) => map.on('moveend', () => handleViewportChange(map))}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {aircrafts.map((aircraft, index) => (
          <Marker
            key={index}
            position={[aircraft.lat, aircraft.lon]}
            icon={createHeadingIcon(aircraft.track)} // Rotate marker based on track (heading)
          >
            <Popup>
              <div>
                <h3>Flight: {aircraft.flight}</h3>
                <p>Altitude: {aircraft.alt_geom} ft</p>
                <p>Aircraft Type: {aircraft.t}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default AircraftMap;
