import React from 'react';
import { useNavigate } from "react-router-dom";
import { Scroll, ArrowRight, Handshake, BookOpen, Users } from "lucide-react";
import logo from "../assets/PalouseTextLogo.png";
import "../styles/Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page page-root">
      <main className="page-shell landing-shell">
        
        <section className="page-hero landing-hero-main">
          <div className="legacy-chip">Since 1984</div>
          <img src={logo} alt="Palouse Alliance" className="hero-logo-img" draggable="false" />
          <h1 className="page-title">
            Building a Healthier <br/>
            <span className="accent-text">Palouse Community</span>
          </h1>
          <p className="page-description">
            Your central interagency consortium for health and human service providers 
            across the Palouse region.
          </p>
          <div className="landing-actions">
            <button 
              className="btn-primary landing-btn" 
              onClick={() => navigate('/events')}
            >
              Community Events
            </button>
            <button 
              className="btn-secondary landing-btn" 
              onClick={() => navigate('/organizations')}
            >
              Organizations
            </button>
          </div>
        </section>

        <section className="history-feature" aria-labelledby="history-title">
          <div className="history-feature-icon" aria-hidden="true">
            <Scroll size={24} className="history-feature-icon-svg" aria-hidden="true" />
          </div>
          <div className="history-feature-copy">
            <h2 id="history-title">Our Story on the Palouse</h2>
            <p>Learn how the Palouse Alliance began and how decades of partnership have shaped our work today.</p>
            <button className="btn-primary history-feature-button" onClick={() => navigate('/history')}>
              Explore Our History
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>

        <div className="masonry-container landing-pillars">
          <div className="masonry-item">
            <div className="static-pillar-card">
              <div className="pillar-icon-badge" aria-hidden="true">
                <Handshake size={24} />
              </div>
              <h3 className="pillar-title org-title">Coordinate</h3>
              <p className="pillar-description org-description">
                We bridge the gaps between regional providers to ensure seamless community support systems.
              </p>
            </div>
          </div>

          <div className="masonry-item">
            <div className="static-pillar-card">
              <div className="pillar-icon-badge" aria-hidden="true">
                <BookOpen size={24} />
              </div>
              <h3 className="pillar-title org-title">Network</h3>
              <p className="pillar-description org-description">
                We serve as a trusted resource to facilitate networking and collaboration.
              </p>
            </div>
          </div>

          <div className="masonry-item">
            <div className="static-pillar-card">
              <div className="pillar-icon-badge" aria-hidden="true">
                <Users size={24} />
              </div>
              <h3 className="pillar-title org-title">Advocate</h3>
              <p className="pillar-description org-description">
                We are a collective voice for health and human services in our region.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
