import React from 'react';
import './HospitalMap.css';

export default function HospitalMap({ hospitals }) {
  if (!hospitals || hospitals.length === 0) return null;

  return (
    <div className="hospital-map-wrapper">
      <div className="hospital-cards-grid">
        {hospitals.map((hospital, idx) => (
          <div key={idx} className="hospital-card">
            <div className="hospital-card-img">
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0 }}
                loading="lazy" 
                src={`https://maps.google.com/maps?q=${encodeURIComponent(hospital.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
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
