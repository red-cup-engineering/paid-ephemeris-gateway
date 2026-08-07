# koios-news-data

The data store for **Koios.
News** (koios.news).
Mounted as the `data/` submodule of the `koios-news` repo; `@emsenn/content-production/content-farm` and the served package write here through the farm data layout.

```
logs/      append-only .jsonl event streams — EAVT datoms: the mill run trace
           (mill-runs.jsonl), the view trace (views.jsonl). What happened, in order.
records/   .json / JSON-LD documents — current-state records: the Search Console
           demand pull (search-console.json). What is true now.
```

Runtime-generated files (the live `.jsonl` traces, the fetched `search-console.json`) are gitignored — they regenerate.
The repo tracks the layout; the box holds the data.
