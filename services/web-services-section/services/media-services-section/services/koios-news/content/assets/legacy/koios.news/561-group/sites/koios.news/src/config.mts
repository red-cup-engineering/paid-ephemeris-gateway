// config.mts — the publication's standing facts, shared by the site (index.mts)
// and the mill (mill.mts). A separate module so the mill can run without
// loading the served-site stack (newswire → web-feed → web-server).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const KOIOS_SITE_URL = "https://koios.news";
export const KOIOS_TITLE = "Koios.News";
/** The masthead byline (emsenn, 2026-06-12). */
export const KOIOS_TAGLINE = "Watching the future take shape";
export const KOIOS_DESCRIPTION =
  "An independent news publication covering technology, economy, culture, politics, environment, and war — reading each story for the larger systems it reveals.";
export const KOIOS_EDITOR = "Nik Koios";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CONTENT_PRODUCTION_CONFIG = join(HERE, "..", "content-production.config.json");
export const DEFAULT_CONTENT_DIR = join(HERE, "..", "content", "posts");
export const DEFAULT_DATA_DIR = join(HERE, "..", "data");
