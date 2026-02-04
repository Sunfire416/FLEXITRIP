import React from 'react';
import MultimodalSearch from "../components/MultimodalSearch/MultimodalSearch";

const HomePage = () => (
  <div className="home-page">
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      marginBottom: '20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀 FlexiTrip</h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
        Votre assistant de voyage multimodal accessible
      </p>
    </div>
    <MultimodalSearch />
  </div>
);

export default HomePage;