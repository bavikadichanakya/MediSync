import React, { useEffect, useRef, useState } from 'react';
import './ScrollNarrative.css';

const FRAME_COUNT = 240;

const getFramePath = (index) => 
  `/frames/frame_${index.toString().padStart(6, '0')}.png`;

const preloadImages = () => {
  const images = [];
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    images.push(img);
  }
  return images;
};

export default function ScrollNarrative({ onGetStarted }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const imgs = preloadImages();
    let loaded = 0;
    imgs.forEach(img => {
      img.onload = () => {
        loaded++;
        setImagesLoaded(loaded);
        if (loaded === 1 && imgRef.current) {
          imgRef.current.src = img.src;
        }
      };
    });
    setImages(imgs);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || images.length === 0 || !imgRef.current) return;
      
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const maxScroll = containerRef.current.scrollHeight - window.innerHeight;
      const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
      
      // Update smooth progress bar state
      setScrollProgress(scrollFraction);

      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.floor(scrollFraction * FRAME_COUNT)
      );
      
      requestAnimationFrame(() => {
        if (images[frameIndex]) {
          imgRef.current.src = images[frameIndex].src;
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [images]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="narrative-container" ref={containerRef}>
      <div className="sticky-background">
        <img ref={imgRef} alt="Narrative background" className="narrative-image" />
        
        {imagesLoaded < FRAME_COUNT * 0.2 && (
            <div className="loading-overlay">
                Loading Narrative... {Math.round((imagesLoaded / FRAME_COUNT) * 100)}%
            </div>
        )}
      </div>

      {/* Smooth Sticky Timeline UI */}
      <div className="timeline-ui">
        <div className="timeline-track">
          <div 
            className="timeline-fill" 
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="content-layers">
        <section className="scroll-section">
          <div className="text-content">
            <div className="text-kicker">Welcome</div>
            <h1>Welcome to MediSync</h1>
            <p className="body-text">Your calm, accessible medical record vault. We transform complex data into clear, understandable insights.</p>
            <div className="cta-group">
              <button className="btn-glass" onClick={onGetStarted}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
                Get Started
              </button>
            </div>
          </div>
        </section>
        
        <section className="scroll-section right">
          <div className="text-content">
            <div className="text-kicker">Clarity</div>
            <h2>From Overwhelmed to Organized.</h2>
            <p className="body-text">Stop drowning in medical paperwork. We turn your scattered health records into a clear, unified timeline.</p>
          </div>
        </section>
        
        <section className="scroll-section">
          <div className="text-content">
            <div className="text-kicker">Accessibility</div>
            <h2>Always Accessible</h2>
            <p className="body-text">Designed for both urban and rural settings, ensuring your critical health data is always at hand, no matter where you are.</p>
          </div>
        </section>

        <section className="scroll-section right">
          <div className="text-content">
            <div className="text-kicker">Get Started</div>
            <h2>Own Your Health Data.</h2>
            <p className="body-text">Seamlessly organize your medical records, track your progress, and securely access your health history, anywhere, anytime.</p>
          </div>
        </section>
      </div>

      {/* Floating Scroll to Top Button */}
      <button 
        className={`btn-scroll-top ${scrollProgress > 0.95 ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5"></path>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        Click me to go up
      </button>
    </div>
  );
}
