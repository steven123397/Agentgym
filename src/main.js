import { mountApp } from './ui/app.js';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

mountApp(app);