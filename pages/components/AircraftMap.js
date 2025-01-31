import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';


const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

const AircraftMap = () => {
  const [imagesData, setImagesData] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [aircrafts, setAircrafts] = useState([]);
  const [viewport, setViewport] = useState({
    center: [0,0],
    zoom: 5,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchImageAndAuthor = async (registration) => {
    const rs = await axios.get(`/api/image?registration=${registration}`);
    return rs.data; // { image, author }
  };

  const fetchAircraftData = async (lat, lon, zoom) => {
    const radius = Math.min((250 * zoom) / 10, 250);
    try {
      const response = await axios.get(
        `https://corsproxy.io/https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`
      );
      setAircrafts(response.data.ac || []);
    } catch (error) {
      console.error('Error fetching aircraft data:', error);
    }
  };

  useEffect(() => {
    const { center, zoom } = viewport;
    fetchAircraftData(center[0], center[1], zoom);
  }, []);

  useEffect(() => {
    const { center, zoom } = viewport;
    fetchAircraftData(center[0], center[1], zoom);
  }, [viewport]);

  const handleViewportChange = (map) => {
    const newCenter = map.getCenter();
    const newZoom = map.getZoom();

    setViewport({
      center: [newCenter.lat, newCenter.lng],
      zoom: newZoom,
    });
  };


  useEffect(() => {
    const intervalId = setInterval(() => {
      const { center, zoom } = viewport;
      fetchAircraftData(center[0], center[1], zoom);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [viewport]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setViewport({
            center: [position.coords.latitude, position.coords.longitude],
            zoom: 10,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const data = {};
      for (const aircraft of aircrafts) {
        if (aircraft.r) {
          try {
            const result = await fetchImageAndAuthor(aircraft.r);
            data[aircraft.r] = result;
          } catch (error) {
            console.error(`Failed to fetch image for ${aircraft.r}:`, error);
            data[aircraft.r] = { image: null, author: 'Unknown' };
          }
        }
      }
      setImagesData(data);
    };

    fetchData();
  }, [aircrafts]);

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

        {aircrafts.map((aircraft, index) => (
        <Marker
          key={index}
          position={[aircraft.lat, aircraft.lon]}
          icon={createHeadingIcon(aircraft.track)}
        >
          <Popup>
            <div>
              {imagesData[aircraft.r]?.image ? (
                <a href={imagesData[aircraft.r].image} target="_blank" rel="noopener noreferrer">
                  <img
                    src={imagesData[aircraft.r].image}
                    title={`© ${imagesData[aircraft.r].author}`}
                    alt={`Photo by ${imagesData[aircraft.r].author}`}
                    height={150}
                    width={250}
                  />
                </a>
              ) : (
                <p>Loading image...</p>
              )}
              <h2>{aircraft.flight || 'Unknown'}</h2>
              <h3>{aircraft.t || 'N/A'}</h3>
              <hr />
              <p>Reg: {aircraft.r}</p>
              <p>Altitude: {aircraft.alt_geom ? `${aircraft.alt_geom}ft` : 'N/A'}</p>
              <p>Speed: {aircraft.ias ? `${aircraft.ias}kts` : 'N/A'}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      </MapContainer>
    </div>
  );
};

export default AircraftMap;