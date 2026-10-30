# Cane Companion

Say where. Walk there. An AI co-pilot that guides blind Kenyans to their destination, cane in hand.

Phone worn on a chest harness (camera forward) + open-ear/bone-conduction audio. Speak a destination, hear it read back, follow short sounds and vibration, get head-height and approaching-hazard warnings, and have arrival confirmed by sign reading.

Built for Meta Global AI Developer Hackathon (Build for Your World) — Indie track. The cane stays primary.

> Status: foundations (Oct 30). See [docs/STATUS.md](docs/STATUS.md), [docs/DECISIONS.md](docs/DECISIONS.md), [docs/LOG.md](docs/LOG.md).

## Quick start (placeholder)

PWA lives in `apps/web`, API in `services/api`, shared types in `packages/shared`.

```bash
cp .env.example .env   # add BASETEN_API_KEY
npm install
npm run dev
```

## Safety

The system never says a road is safe to cross, never blocks ambient sound, and the hazard loop runs on-device with no network dependency. See [docs/SAFETY.md](docs/SAFETY.md).

## Attribution

OpenStreetMap data © OpenStreetMap contributors, ODbL. Third-party models and data will be listed here.
