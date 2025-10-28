import React, { useState, useEffect } from 'react';
import ParticleSystem from './ParticleSystem';
import './ParticleSystem.css';

interface PremiumLoadingProps {
  isLoading: boolean;
  onComplete?: () => void;
}

const PremiumLoading: React.FC<PremiumLoadingProps> = ({ isLoading, onComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing Premium Experience...');

  const loadingSteps = [
    { progress: 20, text: 'Loading Premium Assets...' },
    { progress: 40, text: 'Preparing Luxury Interface...' },
    { progress: 60, text: 'Optimizing Performance...' },
    { progress: 80, text: 'Finalizing Premium Experience...' },
    { progress: 100, text: 'Welcome to Pureborn!' }
  ];

  useEffect(() => {
    if (!isLoading) return;

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingProgress(step.progress);
        setLoadingText(step.text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading, onComplete]);

  if (!isLoading) return null;

  return (
    <div className="premium-loading">
      <ParticleSystem
        particleCount={30}
        particleTypes={['oil-drop', 'leaf', 'sparkle']}
        intensity="high"
        className="hero-particles"
      />
      
      <div className="loading-content">
        <div className="loading-logo">PUREBORN</div>
        
        <div className="loading-spinner"></div>
        
        <div className="loading-text">{loadingText}</div>
        
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">{loadingProgress}%</div>
        </div>
        
        <div className="loading-features">
          <div className="feature-item">
            <span className="feature-icon">🌿</span>
            <span className="feature-text">100% Natural</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <span className="feature-text">Premium Quality</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔬</span>
            <span className="feature-text">Lab Tested</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumLoading;
