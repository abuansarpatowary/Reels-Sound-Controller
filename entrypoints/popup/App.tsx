import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import wxtLogo from '/wxt.svg';
import './App.css';

function App() {
  return (
    <div className="popup-container">
      <h1>Reels Sound Controller</h1>
      <p>Control Facebook Reels volume with ease!</p>
      <div className="features">
        <ul>
          <li>Adjust volume with slider</li>
          <li>Persistent volume settings</li>
          <li>Works across all reels</li>
        </ul>
      </div>
      <div className="footer">
        <p>Version 1.0.0</p>
      </div>
    </div>
  );
}

export default App;
