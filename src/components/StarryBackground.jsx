import React, { useEffect, useState } from 'react';
import './StarryBackground.css';

export default function StarryBackground() {
  const [stars, setStars] = useState([]);
  const [comets, setComets] = useState([]);

  useEffect(() => {
    // Generate static twinkling stars (minimal count)
    const newStars = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      twinkleDelay: Math.random() * 5,
      twinkleDuration: Math.random() * 3 + 2
    }));
    setStars(newStars);

    // Generate comets with random positions and delays
    const newComets = Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      top: Math.random() * 40 - 20, // Start above the top edge
      left: Math.random() * 100 + 20, // Start slightly to the right
      delay: Math.random() * 15, // Stagger their appearance
      duration: Math.random() * 2 + 4 // Speed of the fall
    }));
    setComets(newComets);
  }, []);

  return (
    <div className="starry-bg-container">
      {/* Static Stars */}
      {stars.map(star => (
        <div 
          key={`star-${star.id}`} 
          className="star" 
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.twinkleDelay}s`,
            animationDuration: `${star.twinkleDuration}s`
          }}
        />
      ))}

      {/* Shooting Comets */}
      {comets.map(comet => (
        <div 
          key={`comet-${comet.id}`}
          className="comet-container"
          style={{
            top: `${comet.top}%`,
            left: `${comet.left}%`,
            animationDelay: `${comet.delay}s`,
            animationDuration: `${comet.duration}s`
          }}
        >
          <div className="comet" />
        </div>
      ))}
    </div>
  );
}
