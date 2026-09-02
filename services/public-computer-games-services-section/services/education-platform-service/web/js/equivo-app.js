import { mountEducationApp } from './app.js';
import { equivoAdapter } from './equivo-adapter.js';

mountEducationApp({ root: document, adapter: equivoAdapter });
