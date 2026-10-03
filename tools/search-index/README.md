# search-index

Generates `assets/js/jesta-search-index.js`, the data behind the sitewide search overlay, from the
sources the pages render at runtime. Read-only against Firestore (public REST, the web key the site
ships); the only thing it writes is that one file in the repo.

```
node tools/search-index/build.js            # rebuild the file and print what changed
node tools/search-index/build.js --check    # compare only; exit 1 when the committed file is stale
node tools/search-index/build.js --quiet    # one-line summary only
```

Sources, in file order (file order is the tie-break the overlay uses between equal scores):

| Entries | Source | Link |
| --- | --- | --- |
| Pages | the `PAGES` list in build.js | the page |
| Games | `GAME_FILES` in build.js; name and tagline read from each page's `<title>` | the game page |
| Album Series | distinct `section` / `sectionId` on Firestore `releases` | `albums.html#<sectionId>` |
| Albums | Firestore `releases` (visible), page order | `albums.html#album-<bandcamp slug>`, or the section when the release has no Bandcamp slug (ꓘ) |
| Entities and Children | Firestore `entities` (visible); slugs from the `ENT_SLUG` map in entities.html | `entities.html#entity-<slug>` or `#child-<slug>` |
| Tracks | every track on every visible release, plus lyrics songs no release lists | the lyrics song (`lyrics.html#lp-<artist>-<album>-<n>`, slugs as lyrics.html builds them) when the song exists in Firestore `lyrics`, else the album drawer |
| Merch | Firestore `merch` (active), page order | `merch.html#merch-<slug of the name>` |
| Blog Posts | Firestore `blogPosts` (published), newest first | `blog.html#post-<document id>` |

Members, Dossier and Profile are deliberately not indexed (they need a signed-in account). Login is.

`tools/drift-check/drift-check.js` requires this module and fails (ERROR, so the pre-push hook blocks)
when the committed file differs from a fresh build. Fix is always the same: run the build and commit.
Warnings name anchors the static page markup lacks (the Firestore-rendered page still has them).

Changing what the index contains (a new page, a game, a link rule) is a change to build.js, then a
rebuild. Never hand-edit the generated file.
