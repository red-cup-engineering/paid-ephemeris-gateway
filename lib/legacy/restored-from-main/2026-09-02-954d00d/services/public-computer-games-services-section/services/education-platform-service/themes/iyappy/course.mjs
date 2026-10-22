/** Browser/build metadata for the finite Lakȟótiyapi course. */
import { buildIyappyWorld } from '../../dist/themes/iyappy/build-world.js';

export const iyappyCourse = Object.freeze({
  id: 'iyappy',
  buildWorld: buildIyappyWorld,
  adapter: Object.freeze({ path: 'js/vendor/themes/iyappy/browser-adapter.js', exportName: 'iyappyTheme' }),
  browserModules: Object.freeze([
    Object.freeze({ source: new URL('./browser-adapter.mts', import.meta.url), path: 'js/vendor/themes/iyappy/browser-adapter.js' }),
    Object.freeze({ source: new URL('./registry.mts', import.meta.url), path: 'js/vendor/themes/iyappy/registry.js' }),
  ]),
});
