import React from 'react';
import './Logo.css';

const Logo: React.FC = () => {
  return (
    <div className="logo-container">
      <div className="logo-symbol">
        <div className="logo-pb">
          <div className="logo-p">P</div>
          <div className="logo-b">B</div>
        </div>
        <div className="logo-registered">®</div>
      </div>
      <div className="logo-text">PUREBORN</div>
    </div>
  );
};

export default Logo;
