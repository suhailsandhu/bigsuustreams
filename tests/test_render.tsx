import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { App } from '../src/App.tsx';

try {
  console.log('Rendering App component with ReactDOMServer...');
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log('RENDER SUCCESS! HTML output length:', html.length);
  console.log('First 200 chars:', html.slice(0, 200));
} catch (err) {
  console.error('CRASH DURING APP RENDER:');
  console.error(err);
}
