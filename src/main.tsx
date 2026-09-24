import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import FormatStudio from './FormatStudio';
import './base.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <FormatStudio />
    </MotionConfig>
  </React.StrictMode>,
);
