import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

import './HospitalMap.css';

function MapBounds({ hospitals }) {
  const map = useMap();
  useEffect(() => {
    if (hospitals && hospitals.length > 0) {
      const bounds = L.latLngBounds(hospitals.map(h => [h.lat, h.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hospitals, map]);
  return null;
}

export default function HospitalMap({ hospitals }) {
  if (!hospitals || hospitals.length === 0) return null;

  const center = [hospitals[0].lat, hospitals[0].lng];

  return (
    <div className="hospital-map-wrapper">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false}
        className="leaflet-map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds hospitals={hospitals} />
        {hospitals.map((hospital, idx) => (
          <Marker key={idx} position={[hospital.lat, hospital.lng]}>
            <Popup>
              <strong>{hospital.name}</strong><br />
              {hospital.distance} away<br />
              ⭐ {hospital.stars} / 5
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="hospital-cards-grid">
        {hospitals.map((hospital, idx) => (
          <div key={idx} className="hospital-card">
            <div 
              className="hospital-card-img" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=300&q=80')` }}
            >
              <div className="hospital-rating">⭐ {hospital.stars}</div>
            </div>
            <div className="hospital-card-content">
              <h4>{hospital.name}</h4>
              <p className="hospital-distance">📍 {hospital.distance}</p>
              <p className="hospital-review">"{hospital.reviewSummary}"</p>
              <a href={hospital.url} target="_blank" rel="noopener noreferrer" className="btn-book">
                Book Appointment
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
