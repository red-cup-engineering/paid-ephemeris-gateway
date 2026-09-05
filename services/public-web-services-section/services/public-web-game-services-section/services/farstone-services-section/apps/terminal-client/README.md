# Farstone terminal client

This Farstone-owned app adapts Farstone's REST/JSON session protocol to the generic
`@red-cup-engineering/wheatstone` world interface. The dependency direction is deliberate:
Farstone knows about Wheatstone; Wheatstone knows nothing about Farstone.

```sh
npm install
npm test
npm start -- --base https://farstone.561.group --name wanderer
```

`src/world.mjs` owns the game-specific REST routes and event vocabulary. Wheatstone supplies only
the terminal UI and generic carrier contract.
