# koios-news-content

The content store for **Koios.
News** (koios.news) — markdown posts with front matter.
Mounted as the `content/` submodule of the `koios-news` repo, where the served package `@emsenn/koios.news` reads it directly and serves the whole publication.
There is no build step.

```
posts/      published posts (and mill drafts, draft: true)
authors/    the editor's page
rejected/   posts the editorial gates withheld
```

The mill (`content-farm`) writes new posts into `posts/`; shipping a post is `draft: false`.
The live site refreshes on its own.
