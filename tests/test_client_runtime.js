import fs from 'fs';

// Setup mock browser globals
global.window = global;
global.self = global;
global.document = {
  createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }),
  getElementById: () => ({ appendChild: () => {} }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};
global.location = { href: 'http://localhost:3000/', hash: '', search: '', pathname: '/' };
global.MutationObserver = class { observe() {} disconnect() {} };
global.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
global.customElements = { define: () => {} };

try {
  const code = fs.readFileSync('dist/assets/index-BCpQqFl-.js', 'utf8');
  eval(code);
  console.log('Client bundle evaluated successfully without throwing!');
} catch (err) {
  console.error('CRASH IN CLIENT BUNDLE:');
  console.error(err);
}
