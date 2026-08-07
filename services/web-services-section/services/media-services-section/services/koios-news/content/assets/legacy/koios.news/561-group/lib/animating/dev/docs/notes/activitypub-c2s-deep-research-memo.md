# ActivityPub C2S Deep Research Memo: What the FOSDEM Talk Is Pointing At, and What to Build Now

## Thesis

ActivityPub’s **client-to-server API is the dormant half of the protocol**: it gives clients, bridges, bots, agents, and specialized apps a standard way to act for an actor by writing Activities to that actor’s outbox, while the server continues to perform ordinary server-to-server federation.
The leverage is not “replace Mastodon’s API tomorrow.” The leverage is: build a compact C2S-native client and a compatibility bridge, then use the friction to harden the missing pieces: auth, media upload, discovery, push, server feature negotiation, error handling, private fetch, and UX conventions.

The FOSDEM 2026 talk that triggered this is officially framed around exactly that gap: Mastodon built its own client API, that API became widely adopted, while ActivityPub’s specified Client API received minimal attention; the talk explores whether a general-purpose client built on the ActivityPub Client API can push adoption and reveal shortcomings through real implementation work.
The talk was scheduled in the Social Web track on Saturday, January 31, 2026, in a 13:10–13:20 UTC+1 slot, and the official FOSDEM page links video and subtitles.
([fosdem.org](https://fosdem.org/2026/schedule/event/QK7XSV-activitypub-c2s/))

I am grounding the talk-specific analysis in the official schedule, abstract, speaker page, and related FOSDEM/SWICG materials, not in an uncited transcript.
The speaker, Django Doucet, is listed as a Social Web developer and instructor who contributed to WordPress ActivityPub and Immers.
Space and is developing a PWA to push the ActivityPub Client API’s boundaries.
([fosdem.org](https://fosdem.org/2026/schedule/speaker/django_doucet/))

---

## 1. Why this matters now

ActivityPub has always had two layers: a **server-to-server federation protocol** and a **client-to-server protocol**.
The spec describes actors with inboxes and outboxes: servers deliver Activities between actors over inbox/outbox flows, while clients can use the actor’s outbox as the publishing endpoint.
([w3.org](https://www.w3.org/TR/activitypub/))

The Fediverse, in practice, mostly standardized socially around the Mastodon API rather than the ActivityPub Client API.
Mastodon’s own documentation presents its deployed REST API as the application developer surface, with OAuth, scopes, media upload, streaming, app registration, and concrete endpoints.
([docs.joinmastodon.org](https://docs.joinmastodon.org/client/intro/))

That created the central asymmetry:

| Thing | Federation world | Client world |
|---|---|---|
| Inter-server interoperability | Mostly ActivityPub / ActivityStreams-based | N/A |
| Mobile/web client interoperability | Often Mastodon-compatible REST APIs | C2S mostly absent |
| Data model | Activities, actors, objects, collections | Statuses, accounts, notifications, timelines |
| Extensibility | JSON-LD / ActivityStreams vocabularies | App-specific endpoint models |
| Practical developer path | Hard, but standardized | Easy, but server-specific |

The FOSDEM talk is important because it is not just a protocol-theory talk.
It appears in a broader moment where the Social Web track has become much more prominent at FOSDEM: Mastodon’s own recap says the Social Web presence grew from no specific track in 2024, to a half-day in 2025, to a full-day in 2026 with 29 speakers.
([blog.joinmastodon.org](https://blog.joinmastodon.org/2026/02/fosdem-2026-recap/))

Related FOSDEM 2026 talks point in the same direction.
Bonfire’s session explicitly mentions ActivityPub federation, ATProto bridging, C2S API use for app integration, MLS messaging, interoperability, extensions, moderation, and bridging.
Fedify’s talk frames ActivityPub implementation pain around JSON-LD, HTTP signatures, FEPs, and interop, and presents a framework that hides protocol plumbing behind typed vocabulary and signature support.
([fosdem.org](https://fosdem.org/2026/schedule/event/LSUYXG-bonfire_modular_communication_tools_on_the_open_social_web/))

The strategic read: **C2S is re-entering the conversation because the Fediverse is no longer just microblogging.** The moment you want events, long-form publishing, media libraries, groupware, collaborative tools, specialized moderation, bridges, local-first clients, or delegated agents, a Mastodon-shaped REST API becomes a bottleneck.

---

## 2. What C2S actually is in the ActivityPub spec

At the protocol level, ActivityPub C2S is simple.

A client discovers the actor’s `outbox`, authenticates as that actor, and `POST`s either an Activity or a non-Activity object to that outbox.
The server is expected to generate canonical IDs, persist the object/activity, apply local side effects, and then perform federation delivery through normal S2S rules.
([w3.org](https://www.w3.org/TR/activitypub/))

A minimal C2S write can look like this:

```http
POST /users/alice/outbox HTTP/1.1
Host: example.social
Authorization: Bearer <token>
Content-Type: application/activity+json
Accept: application/activity+json

{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Note",
  "content": "<p>Testing ActivityPub C2S.</p>",
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "cc": ["https://example.social/users/alice/followers"]
}
```

Because that payload is a non-Activity object, the server may wrap it in a `Create` Activity, assign IDs, copy the actor to `attributedTo`, add the created object to the actor’s outbox, and then deliver it according to addressing.
The spec explicitly allows clients to submit non-Activity objects and requires the server to convert them into `Create` Activities.
([w3.org](https://www.w3.org/TR/activitypub/))

The canonical server-side result might become:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.social/users/alice/activities/01J...",
  "type": "Create",
  "actor": "https://example.social/users/alice",
  "published": "2026-06-25T18:00:00Z",
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "cc": ["https://example.social/users/alice/followers"],
  "object": {
    "id": "https://example.social/users/alice/objects/01J...",
    "type": "Note",
    "attributedTo": "https://example.social/users/alice",
    "content": "<p>Testing ActivityPub C2S.</p>",
    "to": ["https://www.w3.org/ns/activitystreams#Public"],
    "cc": ["https://example.social/users/alice/followers"]
  }
}
```

The client is responsible for addressing.
ActivityPub says clients should use `to`, `bto`, `cc`, `bcc`, and `audience`, and may need to inspect the object, target, reply target, tags, actor, and attributed actor to infer recipients.
Servers remove `bto` and `bcc` before delivery/display, but still use them for routing.
([w3.org](https://www.w3.org/TR/activitypub/))

That last point is huge for implementation.
C2S does **not** mean “the client sends a post and the server guesses everything.” It means the client constructs ActivityStreams-shaped intent, and the server becomes the authority that validates, canonicalizes, persists, and federates.

---

## 3. The key mental model: C2S changes the UX boundary, not federation semantics

In normal S2S ActivityPub, delivery works by resolving recipients from addressing fields such as `to`, `bto`, `cc`, `bcc`, and `audience`, dereferencing actors to find inboxes, optionally using `sharedInbox`, deduplicating inboxes, excluding the sender, and performing delivery asynchronously with retries.
([w3.org](https://www.w3.org/TR/activitypub/))

C2S inserts itself **before** that.

```text
Client / agent / bridge
        |
        | authenticated POST Activity or Object
        v
Actor outbox on home server
        |
        | validation, ID minting, side effects, storage
        v
Normal ActivityPub federation delivery
        |
        v
Remote actor inboxes / shared inboxes
```

That is why the FOSDEM framing is powerful.
A C2S-native client can unlock new UX without changing the federation layer.
It does not require a new federation protocol.
It does not require every remote server to support C2S.
It only requires the user’s home server, or a bridge in front of it, to expose a usable client surface.

This is also why C2S is attractive for “small, focused prototypes.” A good prototype does not need to solve the whole Fediverse.
It can start by proving:

1. A client can authenticate to an actor.
2. It can discover inbox/outbox/endpoints.
3. It can read enough actor/collection state to render useful UI.
4. It can write valid ActivityStreams objects to outbox.
5. The server can federate them normally.
6. Unsupported types degrade gracefully instead of being thrown away.

That is already enough to reveal the real gaps.

---

## 4. Why C2S did not win the first time

The blunt answer: Mastodon shipped a practical client API; C2S remained too abstract.

Mastodon has a deployed REST API with app registration, OAuth scopes, status creation, media upload, streaming over SSE/WebSocket, notifications, timelines, accounts, filters, search, moderation actions, and stable client expectations.
([docs.joinmastodon.org](https://docs.joinmastodon.org/client/intro/))

There is even a long-open Mastodon GitHub issue titled “ActivityPub client-to-server support,” opened in April 2019, whose pitch was that implementing C2S would let users sign in from any ActivityPub app and avoid Mastodon’s proprietary API becoming the de facto client standard.
([github.com](https://github.com/mastodon/mastodon/issues/10520))

The ActivityPub API Task Force says the quiet part explicitly: ActivityPub defines a Social API, but the read-write API is not widely implemented; instead, platform-specific APIs such as Mastodon’s and Threads’ are used, and many projects clone the Mastodon API for client compatibility.
The task force calls this a chicken-and-egg problem: no clients because no servers, no servers because no clients.
([github.com](https://github.com/swicg/activitypub-api))

The missing pieces were not trivial.
Community discussions have repeatedly pointed out that C2S leaves or historically left many practical questions underspecified: notifications, media upload, profile fetching, search, follow-request state, read/unread state, auth, remote object fetching, JSON-LD normalization, and how to interpret the many equally valid ActivityStreams representations.
([socialhub.activitypub.rocks](https://socialhub.activitypub.rocks/t/activitypub-client-to-server-faq/1941))

So the reason C2S is underused is not that the core idea is bad.
It is that **the spec-level primitive is smaller than the product-level API surface clients expect**.

---

## 5. The new SWICG/API Task Force work matters more than the old spec alone

The current ActivityPub API Task Force is effectively trying to make C2S implementable as a modern Social API.
Its public README says ActivityPub sections 3–5 describe read-only API concerns and section 6 describes the write interface, but the read-write API has not been widely implemented.
It also lists concrete user stories: OAuth profile, server features, feature discovery, rate limits, CORS, media upload, push delivery, remote object access, collection membership, filters, fallback representations, notifications/home-feed separation, search, blocking, muting, follower requests, profile editing, local feeds, moderation, trending, recommendations, and directory features.
([github.com](https://github.com/swicg/activitypub-api))

This matters because it moves C2S from “just POST to outbox” toward a deployable API profile.

The experimental **Basic Profile for Social API Servers** is especially important.
It proposes that Social API servers support actor profiles, inbox/outbox collections, object creation/update/delete for common ActivityStreams object types such as `Article`, `Audio`, `Image`, `Note`, and `Video`, media upload, proxying remote resources, OAuth bearer-token authentication, OAuth metadata discovery, dynamic client registration, refresh tokens, PKCE, actor identity in token responses, problem-detail errors, CORS, caching, and rate-limit headers.
([swicg.github.io](https://swicg.github.io/activitypub-api/basicprofile))

The experimental **Server-Sent Events for ActivityPub API** report addresses the obvious realtime gap.
It frames the ActivityPub API as a RESTful API where local objects are fetched directly, remote objects may be fetched through `proxyUrl`, writes happen by posting to outbox, and SSE can provide one-way push updates so clients do not need to poll inboxes or collections forever.
([swicg.github.io](https://swicg.github.io/activitypub-api/sse))

The task force’s open issue list as of June 2026 includes topics like relationship endpoints, content collections, OAuth scopes for extensions, anonymous or pseudonymous OAuth, rich authorization requests, interop matrices, protocol design, HTTP caching, and avoiding misconceptions.
([github.com](https://github.com/swicg/activitypub-api/issues))

The implementation takeaway: **do not implement “raw ActivityPub C2S from 2018 and stop.”** Implement the core spec, but design your server/client boundary so it can absorb the emerging Social API profile work.

---

## 6. C2S is not “a Mastodon API replacement”; it is an ActivityStreams-native delegation layer

The most important conceptual mistake is to see C2S as “Mastodon API, but standardized.”

That is too small.

A SocialHub discussion from March 2026 argues that ActivityPub should be understood as a protocol layer for extensible actors exchanging activities with object payloads, not merely as a way to publish social-media posts.
It warns against leaking application-specific abstractions like “post” or “avatar” into the protocol layer when the protocol’s power is its generic Activity/object model.
([socialhub.activitypub.rocks](https://socialhub.activitypub.rocks/t/activitypub-api-avoid-misconception/8577))

Older C2S discussions made the delegation point clearly: C2S is not only for human-facing UI clients.
It can support services acting on behalf of an actor, external agents, applets, bridges, and adjunct services.
One discussion gives the example of using a service like PeerTube adjunct to a generic ActivityPub server, where the service has constrained delegated authority rather than owning the whole account.
([socialhub.activitypub.rocks](https://socialhub.activitypub.rocks/t/implementing-activitypub-client-to-server/981))

That is the big design space:

```text
Traditional model:
  server owns identity + UI + API + storage + moderation + federation

C2S/delegation model:
  server owns actor authority + storage + federation + policy
  clients/agents own specialized UX and workflows
```

This could support:

| Prototype | C2S value |
|---|---|
| Minimal mobile client | One ActivityStreams-native client across servers |
| Long-form editor | Publish `Article` without forcing it into `Note` semantics |
| Media workflow app | Create `Image`, `Audio`, `Video`, attachments, collections |
| Event/calendar bridge | Act as an actor without becoming a full S2S server |
| Moderation console | Write Blocks, Flags, Announce policies, collection changes |
| Group/community UI | Manage collections and group-addressed Activities |
| Bot/agent framework | Delegated actor actions through OAuth scopes |
| Cross-protocol bridge | Translate another protocol into actor-authorized outbox writes |

This is where “small focused prototypes” become unusually valuable.
You do not need a universal app. You need one sharp client that demonstrates a non-Mastodon-shaped workflow.

---

## 7. The counterargument: C2S is not magic

There is a real, useful skeptical view: REST APIs can also be generic, mobile clients already support multiple backends, and C2S alone does not solve identity mobility, account portability, moderation, server policy, or product UX.
SocialHub discussion around “liberating clients” includes exactly this counterpoint: the Fediverse can already have apps that support multiple APIs, and ActivityPub C2S is still “just another JSON API” unless the ecosystem actually agrees on behavior and compatibility.
([socialhub.activitypub.rocks](https://socialhub.activitypub.rocks/t/liberating-clients-from-servers-without-throwing-out-baby-with-bathwater/5416))

That skepticism is correct.

C2S does not automatically solve:

| Problem | Why C2S alone does not solve it |
|---|---|
| Account portability | Actor IDs and authority remain server-bound unless separate work handles migration/delegation |
| Rich UX | ActivityStreams gives primitives, not product design |
| Moderation | Servers still enforce policy; clients need capability and error semantics |
| Media | Core C2S does not fully specify modern upload workflows |
| Notifications | Inbox is not the same thing as user-facing notifications |
| Search | Search is outside core ActivityPub |
| Private fetch | Requires auth, proxying, and server-specific policy |
| Compatibility | JSON-LD flexibility means clients need normalization rules |
| Server adoption | Clients cannot use C2S where servers do not expose it |

So the pragmatic position is:

> C2S is not a silver bullet.
> It is the right **standard boundary** for delegated actor actions.

That makes it worth implementing, but only if you also build the missing profile around it.

---

## 8. Recommended implementation architecture

For your codebase, I would structure ActivityPub C2S as a first-class layer, not as a thin route that calls your existing “create post” function.

```text
          ┌─────────────────────────────┐
          │ PWA / native client / bridge │
          └──────────────┬──────────────┘
                         │
                         │ WebFinger / actor discovery
                         │ OAuth authorization code + PKCE
                         │ GET actor, inbox, outbox, collections
                         │ POST Activity/Object to outbox
                         │ SSE or polling for updates
                         v
┌──────────────────────────────────────────────────────────┐
│ Social API / C2S ingress                                  │
│ - bearer-token auth                                       │
│ - actor authorization                                     │
│ - ActivityStreams parsing + JSON-LD normalization          │
│ - object wrapping into Create when needed                 │
│ - server-side ID minting                                  │
│ - validation + policy                                     │
│ - side effects                                            │
└──────────────────────────┬───────────────────────────────┘
                           v
┌──────────────────────────────────────────────────────────┐
│ Canonical ActivityPub domain model                        │
│ actors, objects, activities, collections, inbox/outbox     │
│ raw AS2 JSON + normalized relational indexes               │
└──────────────────────────┬───────────────────────────────┘
                           v
┌──────────────────────────────────────────────────────────┐
│ Federation layer                                           │
│ - recipient resolution                                     │
│ - sharedInbox optimization                                 │
│ - HTTP signatures                                          │
│ - delivery queue                                           │
│ - retry/backoff                                            │
│ - inbox verification                                       │
└──────────────────────────────────────────────────────────┘
```

The design principle: **REST/product entities are views; ActivityStreams objects and Activities are the canonical substrate.**

That prevents the fatal mistake of implementing C2S as a lossy adapter into a Mastodon-shaped `status` table.
You can still expose Mastodon-compatible REST endpoints, but they should be projections over the same actor/activity/object store.

---

## 9. Core server-side C2S algorithm

A production-ish outbox handler should do roughly this:

```ts
async function postOutbox(req: Request, actorId: string): Promise<Response> {
  const token = await requireBearerToken(req);
  await requireTokenCanActAs(token, actorId, "outbox:write");

  const actor = await loadLocalActor(actorId);
  const input = await parseActivityStreams(req);

  const activity = isActivity(input)
    ? input
    : wrapObjectInCreate(input, actor.id);

  // Server is authority for local IDs and actor ownership.
  removeClientSuppliedLocalIdsWhereNeeded(activity);
  assertOrSetActor(activity, actor.id);
  validateActivityRequiredFields(activity);

  // Server must not leak blind-copy fields after delivery/display.
  const deliveryAddressing = extractAddressing(activity);
  const publicRepresentation = stripBtoBcc(activity);

  // Normalize but preserve the original AS2 document.
  const normalized = await normalizeActivity(publicRepresentation);

  // Apply ActivityPub side effects.
  await applyLocalSideEffects(actor, normalized);

  // Persist to outbox.
  const persisted = await persistOutboxActivity(actor, normalized);

  // Enqueue federation delivery. Do not block request on remote servers.
  await enqueueDelivery(persisted.id, deliveryAddressing);

  return new Response(null, {
    status: 201,
    headers: {
      Location: persisted.id,
      "Content-Type": "application/activity+json"
    }
  });
}
```

Spec details that matter here:

* The server should ignore client-submitted Activity IDs and generate new IDs.
* Successful C2S creation returns `201 Created` with a `Location` header.
* Servers may reject C2S with `405 Method Not Allowed` when unsupported.
* Servers remove `bto` and `bcc` before delivery/display but still use them for targeting.
* Clients may submit non-Activity objects, which the server wraps in `Create`.
* `Update` in C2S is partial replacement at the top level; `null` can remove a field.
* S2S `Update`, by contrast, generally sends the complete representation.
  ([w3.org](https://www.w3.org/TR/activitypub/))

That last difference is easy to miss and can cause nasty bugs.
Your internal update model should distinguish:

```text
C2S Update from trusted local client:
  patch-like top-level partial update

S2S Update from remote actor:
  complete object representation, authorized by object origin / actor authority
```

---

## 10. Data model recommendation

Use a dual model: preserve raw ActivityStreams JSON, but index the fields you need for queries, moderation, rendering, and federation.

A practical schema:

```text
actors
  id                      text primary key
  type                    text
  preferred_username      text
  inbox_url               text
  outbox_url              text
  followers_url           text
  following_url           text
  liked_url               text
  shared_inbox_url         text nullable
  public_key_id           text nullable
  public_key_pem          text nullable
  is_local                boolean
  as2                     jsonb
  fetched_at              timestamptz
  updated_at              timestamptz

objects
  id                      text primary key
  type                    text
  attributed_to           text
  owner_actor_id           text nullable
  content                 text nullable
  summary                 text nullable
  name                    text nullable
  url                     text nullable
  media_type              text nullable
  published               timestamptz nullable
  updated                 timestamptz nullable
  deleted_at              timestamptz nullable
  visibility              text
  addressing              jsonb
  as2                     jsonb

activities
  id                      text primary key
  type                    text
  actor_id                text
  object_id               text nullable
  target_id               text nullable
  origin                  text nullable
  addressing              jsonb
  is_local                boolean
  as2                     jsonb
  created_at              timestamptz

collections
  id                      text primary key
  owner_actor_id           text nullable
  type                    text
  name                    text nullable
  as2                     jsonb

collection_items
  collection_id           text
  item_id                 text
  item_kind               text -- actor/object/activity
  sort_key                text
  added_by_activity_id     text nullable
  created_at              timestamptz

inbox_items
  actor_id                text
  activity_id             text
  received_at             timestamptz
  notification_kind        text nullable
  read_at                 timestamptz nullable
  hidden_at               timestamptz nullable

outbox_items
  actor_id                text
  activity_id             text
  published_at            timestamptz

deliveries
  activity_id             text
  inbox_url               text
  shared_inbox_url         text nullable
  recipient_actor_id       text nullable
  state                   text -- pending/sent/failed/dead
  attempts                integer
  next_attempt_at          timestamptz
  last_error              text nullable

oauth_clients
  client_id               text primary key
  client_secret_hash       text nullable
  redirect_uris            jsonb
  grant_types              jsonb
  created_at              timestamptz

oauth_tokens
  token_hash              text primary key
  actor_id                text
  client_id               text
  scopes                  jsonb
  expires_at              timestamptz
  revoked_at              timestamptz nullable

media_assets
  id                      text primary key
  owner_actor_id           text
  type                    text -- Image/Audio/Video/Document
  content_url             text
  media_type              text
  size_bytes              bigint
  width                   integer nullable
  height                  integer nullable
  duration_seconds         numeric nullable
  blurhash                text nullable
  alt_text                text nullable
  as2                     jsonb
```

The reason to preserve raw AS2 is that ActivityStreams allows many equivalent representations: compacted JSON-LD, expanded JSON-LD, strings vs embedded objects, single item vs array, custom contexts, custom object types.
If your schema destroys unknown fields, your C2S client will be less composable than the protocol you are implementing.

---

## 11. Discovery: handle → actor → endpoints

A C2S client needs to discover the actor and relevant endpoints.

The common Fediverse path is WebFinger:

```text
@alice@example.social
        |
        v
acct:alice@example.social
        |
        v
GET https://example.social/.well-known/webfinger?resource=acct:alice@example.social
        |
        v
self link with type application/activity+json
        |
        v
GET actor document
        |
        v
read inbox/outbox/endpoints
```

The W3C WebFinger community report explains this exact pattern: ActivityPub identifiers are HTTPS URIs, while WebFinger resolves usernames like `acct:user@domain` to actor identifiers; clients fetch `/.well-known/webfinger?resource=acct:...
` and parse a `self` link with ActivityPub-compatible media type.
([w3.org](https://www.w3.org/community/reports/socialcg/CG-FINAL-apwf-20240608/))

Mastodon’s interoperability docs say WebFinger is required for Mastodon interop, because `username@domain` mentions must be translated into HTTPS ActivityPub actor URIs before ActivityPub interaction can continue.
([docs.joinmastodon.org](https://docs.joinmastodon.org/spec/webfinger/))

For your codebase, implement discovery as a separate service:

```ts
interface ActorDiscoveryService {
  resolveHandle(handle: string): Promise<ActorId>;
  fetchActor(actorId: string, opts?: FetchOptions): Promise<ActorDocument>;
  discoverEndpoints(actor: ActorDocument): Promise<ActorEndpoints>;
}
```

Cache aggressively but safely:

```text
WebFinger cache:
  key: acct URI
  value: actor URI + rel links
  TTL: moderate, purge on fetch failure or actor mismatch

Actor cache:
  key: actor URI
  value: actor document, inbox, sharedInbox, public key, endpoints
  TTL: short/moderate, revalidate on signature failure or 404/410

Remote object cache:
  key: object URI
  value: object/activity JSON, fetch status, authorization mode
  TTL: depends on object type, cache-control, and privacy
```

Be careful with WebFinger privacy.
The W3C report warns that WebFinger can expose whether an actor exists, and may not be advisable for private actors.
([w3.org](https://www.w3.org/community/reports/socialcg/CG-FINAL-apwf-20240608/))

---

## 12. Authentication and authorization

ActivityPub core does not strongly specify authentication.
The W3C wiki primer says ActivityPub uses auth for both client-server and server-server interactions, but the core spec does not define an official authentication mechanism.
It describes common C2S practice around OAuth 2.0 bearer tokens and S2S practice around HTTP Signatures.
([w3.org](https://www.w3.org/wiki/ActivityPub/Primer/Authentication_Authorization))

For C2S, implement OAuth as the default from day one:

```text
Native/PWA client:
  OAuth Authorization Code + PKCE
  External browser, not embedded webview
  Bearer access token
  Refresh token where supported
  Actor identity included in token response or introspection
```

The Basic Profile work lines up with this: it proposes OAuth bearer-token support, authorization server metadata, dynamic client registration, authorization code grant, refresh tokens, client IDs, PKCE, and actor identity in the token response.
([swicg.github.io](https://swicg.github.io/activitypub-api/basicprofile))

A sensible scope model:

```text
profile:read
profile:write

objects:read
objects:write
objects:delete

inbox:read
outbox:read
outbox:write

media:write

follow:read
follow:write

blocks:read
blocks:write
mutes:read
mutes:write

collections:read
collections:write

search:read
notifications:read
```

Do not overfit to the first scope taxonomy.
The API Task Force still has potential issues around OAuth scopes and extensions.
([github.com](https://github.com/swicg/activitypub-api/issues))

For S2S, you still need HTTP Signatures.
The SWICG HTTP Signatures report says ActivityPub authentication is not specified by the core standard, but the Fediverse mostly uses HTTP Signatures for S2S; a 2024 survey found all 16 surveyed projects supported HTTP Signatures, with the older cavage-12 draft still common and newer signature specifications emerging.
([swicg.github.io](https://swicg.github.io/activitypub-http-signature/))

Implementation recommendation:

```text
C2S auth:
  OAuth bearer tokens
  PKCE
  DCR optional but useful
  scopes
  actor-bound authorization checks

S2S auth:
  HTTP Signatures compatibility
  support legacy draft-cavage signatures where needed
  plan for RFC 9421-style signatures
  signed GET for authorized fetch
  signed POST to inbox
```

Your C2S authorization check should not merely say “valid token.” It must say:

```text
Does this token allow this client to perform this activity type
on behalf of this actor
against this object/target
under local policy
with this addressing?
```

That is where the server remains the policy boundary.

---

## 13. Server capabilities and endpoint discovery

A usable C2S client needs to know what the server supports.

The ActivityPub API Task Force lists feature discovery, server features, rate limits, media upload, CORS, push delivery, remote object access, search, notifications, moderation, and fallback representations as concrete user stories.
([github.com](https://github.com/swicg/activitypub-api))

Expose capabilities explicitly.

A possible actor endpoint fragment:

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    {
      "oauthAuthorizationEndpoint": "as:oauthAuthorizationEndpoint",
      "oauthTokenEndpoint": "as:oauthTokenEndpoint",
      "oauthRegistrationEndpoint": "as:oauthRegistrationEndpoint",
      "uploadMedia": "https://w3id.org/fep/social-api#uploadMedia",
      "proxyUrl": "https://www.w3.org/ns/activitystreams#proxyUrl",
      "eventStream": "https://w3id.org/fep/social-api#eventStream"
    }
  ],
  "id": "https://example.social/users/alice",
  "type": "Person",
  "preferredUsername": "alice",
  "inbox": "https://example.social/users/alice/inbox",
  "outbox": "https://example.social/users/alice/outbox",
  "followers": "https://example.social/users/alice/followers",
  "following": "https://example.social/users/alice/following",
  "liked": "https://example.social/users/alice/liked",
  "endpoints": {
    "oauthAuthorizationEndpoint": "https://example.social/oauth/authorize",
    "oauthTokenEndpoint": "https://example.social/oauth/token",
    "oauthRegistrationEndpoint": "https://example.social/oauth/register",
    "uploadMedia": "https://example.social/api/activitypub/media",
    "proxyUrl": "https://example.social/api/activitypub/proxy?uri={uri}",
    "eventStream": "https://example.social/users/alice/events"
  }
}
```

Basic Profile discusses media upload and `proxyUrl`, and proposes that actor endpoints may declare OAuth authorization, token, and registration endpoints.
([swicg.github.io](https://swicg.github.io/activitypub-api/basicprofile))

Capabilities endpoint recommendation:

```http
GET /.well-known/activitypub-api
Accept: application/json
```

```json
{
  "profiles": [
    "https://www.w3.org/wiki/SocialCG/ActivityPub/API/BasicProfile"
  ],
  "activityTypes": ["Create", "Update", "Delete", "Follow", "Like", "Announce", "Undo"],
  "objectTypes": ["Note", "Article", "Image", "Audio", "Video", "Page"],
  "collections": {
    "inbox": true,
    "outbox": true,
    "followers": true,
    "following": true,
    "liked": true,
    "bookmarks": false
  },
  "features": {
    "mediaUpload": true,
    "proxyUrl": true,
    "eventStream": true,
    "search": false,
    "notifications": true,
    "lists": false,
    "filters": false
  },
  "limits": {
    "maxObjectBytes": 262144,
    "maxMediaBytes": 104857600,
    "maxRecipients": 5000
  }
}
```

This is not necessarily a standard endpoint.
It is a recommended local contract while the task force work matures.

---

## 14. Media upload: do not ignore it

Core ActivityPub C2S is enough to create an `Image` object if the media already exists somewhere addressable.
It is not enough for modern clients that need to upload, process, attach, caption, transcode, scan, and serve media.

The API Task Force explicitly lists media upload as a user story, and the Basic Profile proposes a `MediaUpload` endpoint along with support for common object types such as `Article`, `Audio`, `Image`, `Note`, and `Video`.
([github.com](https://github.com/swicg/activitypub-api))

Recommended flow:

```text
1. Client uploads binary media to media endpoint.
2. Server validates MIME type, size, dimensions, duration.
3. Server scans for malware / disallowed content.
4. Server stores original and derived variants.
5. Server returns an ActivityStreams object, usually Image/Audio/Video/Document.
6. Client references that object in attachment, icon, image, or url.
7. Client POSTs Create to outbox.
```

Example upload result:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.social/media/01J...",
  "type": "Image",
  "mediaType": "image/jpeg",
  "url": "https://cdn.example.social/media/01J.../original.jpg",
  "name": "Alt text for the uploaded image",
  "width": 1600,
  "height": 900
}
```

Then the client posts:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Note",
  "content": "<p>Look at this.</p>",
  "attachment": [
    "https://example.social/media/01J..."
  ],
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "cc": ["https://example.social/users/alice/followers"]
}
```

Do not make media an afterthought.
Without media, a C2S client will feel like a toy.

---

## 15. Reading: inbox/outbox is not enough for UX

ActivityPub gives you inboxes, outboxes, collections, objects, and actors.
Product clients expect home feeds, notifications, mentions, conversations, search, filters, moderation state, bookmarks, lists, read/unread state, and local recommendations.

The API Task Force’s user stories explicitly separate home feed and notifications and include fallback representations, search, block/mute, follower requests, local feed, moderation, trending, recommendations, and directory features.
([github.com](https://github.com/swicg/activitypub-api))

The architecture should treat these as **derived views**, not protocol truth.

```text
Canonical:
  inbox collection
  outbox collection
  object store
  activity store
  actor graph
  collection memberships

Derived:
  home timeline
  notifications
  mentions
  conversations
  local feed
  search index
  moderation queue
  unread state
  bookmarks
  lists
```

A practical client-read API might expose:

```http
GET /users/alice/inbox
GET /users/alice/outbox
GET /users/alice/collections/home
GET /users/alice/collections/notifications
GET /users/alice/collections/bookmarks
GET /users/alice/collections/follower-requests
```

Return ActivityStreams `OrderedCollection` / `OrderedCollectionPage` objects, but use collection IDs that communicate the server’s view semantics.
The server should be honest when a collection is derived, filtered, or local-only.

---

## 16. Realtime: SSE is the right first prototype

Mastodon’s streaming API supports SSE/WebSocket and has concrete categories and event types for user, public, local, hashtag, list, and direct streams.
([docs.joinmastodon.org](https://docs.joinmastodon.org/methods/streaming/))

The ActivityPub API SSE proposal is aligned with a simpler model: clients can read collections via REST and receive push updates through server-sent events, while writes continue to happen through outbox POSTs.
([swicg.github.io](https://swicg.github.io/activitypub-api/sse))

Prototype this:

```http
GET /users/alice/events
Authorization: Bearer <token>
Accept: text/event-stream
```

Events:

```text
event: Add
data: {"target":"https://example.social/users/alice/inbox","object":"https://remote.example/activities/123"}

event: Update
data: {"object":"https://remote.example/objects/456"}

event: Remove
data: {"target":"https://example.social/users/alice/collections/notifications","object":"https://remote.example/activities/789"}

event: Delete
data: {"object":"https://remote.example/objects/deleted"}
```

Client behavior:

```text
On Add:
  fetch or hydrate object
  insert into matching collection view

On Update:
  refetch object or apply patch if available
  refresh rendered cards

On Remove:
  remove from target collection

On Delete:
  tombstone local object
```

SSE is easier than WebSockets, works well for one-way server updates, maps naturally to ActivityStreams collection changes, and is enough for the first serious C2S client.

---

## 17. Bridge architecture: how to ship before servers support C2S

Because most servers do not expose C2S, you need a bridge strategy.

There are two useful bridge directions:

```text
A. C2S client -> C2S bridge -> Mastodon API server
B. Mastodon API client -> Mastodon-compatible facade -> C2S server
```

For your current ActivityPub code, direction A is probably more useful.
It lets you write the client as if C2S exists, then map to Mastodon-compatible APIs where needed.

### Mapping table

| C2S Activity | Mastodon-like action | Notes |
|---|---|---|
| `Create Note` | Create status | Easy for basic text posts |
| `Create Note` with attachments | Create media, then status | Needs upload lifecycle |
| `Like` | Favourite | Mostly direct |
| `Undo Like` | Unfavourite | Mostly direct |
| `Announce` | Boost / reblog | Mostly direct |
| `Undo Announce` | Unboost | Mostly direct |
| `Follow` | Follow account | Requires actor/account mapping |
| `Undo Follow` | Unfollow account | Requires actor/account mapping |
| `Block` | Block account | Local policy semantics differ |
| `Undo Block` | Unblock account | Local policy semantics differ |
| `Delete` | Delete status | Only local-authorized objects |
| `Update` | Edit status | Limited; C2S partial-update semantics may not map cleanly |
| `Create Article` | No standard equivalent | Must degrade or use custom endpoint |
| `Create Event` | No standard equivalent | Needs extension support |
| Collection Add/Remove | Lists/bookmarks/pins maybe | Product-specific mapping |

The bridge must be lossy by design.
The point is not perfect semantic preservation.
The point is to give the C2S client enough terrain to become real while measuring where Mastodon-shaped APIs constrain generic ActivityStreams UX.

A bridge should maintain an explicit capability matrix:

```json
{
  "server": "mastodon-compatible",
  "nativeC2S": false,
  "mappedActivities": {
    "Create/Note": "full",
    "Create/Article": "unsupported",
    "Like": "full",
    "Announce": "full",
    "Follow": "full",
    "Update/Note": "partial",
    "Delete": "partial"
  },
  "features": {
    "mediaUpload": true,
    "eventStream": true,
    "proxyUrl": false,
    "collections": "partial",
    "notifications": "native-mastodon",
    "search": "native-mastodon"
  }
}
```

That matrix should drive the UI.
Do not let the client assume every server can do every Activity.

---

## 18. Security checklist

ActivityPub’s own security section warns implementers not to blindly trust submitted content; servers should verify that actors are authorized to modify objects, validate origin/ownership, protect against spoofing, avoid displaying `bto`/`bcc`, sanitize HTML, defend against recursive object graphs, limit collection pages, and apply rate limits and delivery retry/backoff to avoid denial-of-service problems.
([w3.org](https://www.w3.org/TR/activitypub/))

For your implementation, treat this checklist as mandatory:

| Area | Requirement |
|---|---|
| C2S auth | Bearer token required for write endpoints |
| Actor binding | Token must be allowed to act as the actor whose outbox is targeted |
| Activity ownership | Local clients cannot update/delete objects they do not control |
| Remote authority | S2S Update/Delete must come from authorized actor/origin |
| ID minting | Server owns local canonical IDs |
| HTML | Sanitize `content`, `summary`, names, attachments |
| Blind copy | Strip and never display `bto`/`bcc` |
| SSRF | Restrict remote fetches to safe schemes and public IP ranges |
| Fetch limits | Max bytes, timeout, redirects, recursion depth |
| JSON-LD | Cache contexts safely; avoid unbounded remote context expansion |
| Delivery | Async queue, dedupe inboxes, retry with exponential backoff |
| Rate limits | Per actor, per token, per IP, per inbox, per remote domain |
| Replay | Signature date windows, digest checks, idempotency |
| Blocks/mutes | Enforce before delivery, display, notification, and search indexing |
| Private content | Do not fetch or expose without actor authorization |
| Error format | Use machine-readable problem details where possible |

Special attention: SSRF.
ActivityPub implementers are constantly dereferencing remote URLs.
Never let arbitrary ActivityStreams `id`, `url`, `icon`, `image`, `attachment`, or `context` values become unrestricted server-side fetches.

Remote fetch policy:

```text
Allowed:
  https:// public IP
  http:// only if explicitly allowed for local/dev federation

Denied:
  localhost
  private RFC1918 ranges
  link-local
  metadata IP ranges
  file://
  gopher://
  ftp://
  data:
  javascript:
  oversized redirects
  redirect chains to denied ranges
```

---

## 19. Interoperability rules that will save you months

ActivityPub interop bugs are often representation bugs.

Implement these normalizations:

```text
Accept string IDs where embedded objects are allowed.
Accept embedded objects where IDs are allowed, but canonicalize to IDs internally.
Accept arrays and singletons for fields that are functionally multi-valued.
Preserve unknown fields.
Preserve unknown @context entries.
Support compacted ActivityStreams JSON-LD.
Do not require every remote object to use exactly your preferred shape.
Treat missing optional fields as missing, not invalid.
Tombstone deleted objects instead of hard-failing references.
```

Rendering fallback matters.
If the client receives an unsupported object type, show something useful:

```text
Unsupported object type: Event
Actor: @alice@example.social
Name: ActivityPub API Sync
Summary: Planning session
Open original object
Raw ActivityStreams details
```

This is how a general-purpose client becomes valuable.
It does not need to deeply understand every object type.
It needs to avoid destroying, hiding, or misrepresenting them.

---

## 20. Minimal C2S client prototype: what to build first

Build a client that is boring, strict, and useful.

### Phase 1: actor login and discovery

```text
Input:
  @alice@example.social

Steps:
  WebFinger handle
  fetch actor
  discover inbox/outbox/endpoints
  discover OAuth metadata
  OAuth authorization code + PKCE
  store token
  fetch actor profile
```

Success criterion:

```text
The client can log in to any server that supports your C2S profile
and render the actor profile plus discovered capabilities.
```

### Phase 2: read collections

```text
GET actor.inbox
GET actor.outbox
GET actor.following
GET actor.followers
GET actor.liked
```

Render:

```text
Activity card
Object card
Actor card
Unsupported object fallback
Raw details panel
```

Success criterion:

```text
The client can render inbox/outbox pages without assuming Mastodon statuses.
```

### Phase 3: write basic Activities

Implement:

```text
Create Note
Create Article
Create Image attachment flow
Like
Undo Like
Announce
Undo Announce
Follow
Undo Follow
Delete own object
Update own object
```

Success criterion:

```text
Every write creates a valid ActivityStreams Activity,
gets a 201 Location,
appears in outbox,
and federates normally.
```

### Phase 4: addressing assistant

The client must help users avoid broken delivery.

Addressing logic:

```text
Public post:
  to: Public
  cc: actor.followers

Followers-only:
  to: actor.followers

Direct:
  to: mentioned actors
  bto/bcc only where intentionally hidden

Reply:
  include inReplyTo
  include replied-to actor
  include mentioned actors
  preserve or adapt visibility according to server policy

Group:
  to: group actor or collection
  cc: followers if public-ish
```

Success criterion:

```text
Replies reach the expected participants
without accidentally leaking private recipients.
```

### Phase 5: realtime

```text
GET actor eventStream
Apply Add/Update/Remove/Delete events to local collection cache.
```

Success criterion:

```text
Timeline and notifications update without polling.
```

---

## 21. Server prototype: what to build first

On the server, implement a feature-flagged C2S profile.

### Required endpoints

```text
GET  /.well-known/webfinger
GET  /.well-known/oauth-authorization-server
POST /oauth/register              optional but useful
GET  /oauth/authorize
POST /oauth/token

GET  /actors/{id}
GET  /actors/{id}/inbox
GET  /actors/{id}/outbox
POST /actors/{id}/outbox

GET  /actors/{id}/followers
GET  /actors/{id}/following
GET  /actors/{id}/liked

POST /api/activitypub/media
GET  /api/activitypub/proxy?uri={uri}
GET  /actors/{id}/events
```

### Required Activity support

```text
Create
Update
Delete
Follow
Accept
Reject
Like
Announce
Block
Undo
Add
Remove
```

### Required object support

```text
Note
Article
Image
Audio
Video
Document
Page
Tombstone
Collection
OrderedCollection
CollectionPage
OrderedCollectionPage
```

Basic Profile’s proposed object set includes common content types like `Article`, `Audio`, `Image`, `Note`, and `Video`, and also expects collection support.
([swicg.github.io](https://swicg.github.io/activitypub-api/basicprofile))

### Required federation support

```text
S2S signed POST to inbox
S2S signed GET where remote requires authorized fetch
sharedInbox delivery
delivery deduplication
retry/backoff
remote actor/object cache
Delete -> Tombstone
Follow -> wait for Accept before following collection mutation
Like/Announce collection side effects
```

ActivityPub defines side effects for Create, Follow/Accept/Reject, Like, Announce, Delete, and related Activities, while noting that remote deletion cannot be perfectly enforced.
([w3.org](https://www.w3.org/TR/activitypub/))

---

## 22. Test matrix

Build a matrix, not just unit tests.

| Test area | Cases |
|---|---|
| Content types | Note, Article, Image, Video, unknown custom type |
| Activity types | Create, Update, Delete, Like, Announce, Follow, Accept, Reject, Undo |
| Addressing | Public, followers-only, direct, reply, hidden bto/bcc |
| Discovery | WebFinger, actor fetch, endpoints, OAuth metadata |
| Auth | valid token, expired token, wrong actor, insufficient scope |
| Media | upload, attach, alt text, invalid MIME, oversized file |
| Federation | inbox POST, sharedInbox, retry, dedupe, signed fetch |
| Collections | inbox/outbox pages, pagination, ordering, collection Add/Remove |
| Realtime | SSE Add, Update, Remove, Delete, reconnect |
| Safety | SSRF, HTML sanitization, recursive object graph, oversized JSON |
| Compatibility | Mastodon bridge, native C2S server, Fedify-based server, Bonfire-like extensions |
| UX fallback | unsupported object, missing actor, deleted object, private object denied |

Measure each operation as:

```text
native
mapped
partial
unsupported
broken
```

That gives you an interop dashboard instead of vibes.

---

## 23. The highest-value prototype path

Build two things in parallel.

### Prototype A: C2S-native PWA/mobile client

Purpose: prove the UX.

Core features:

```text
OAuth login
actor discovery
profile render/edit
inbox/outbox read
Create Note
Create Article
media upload
Like / Undo Like
Announce / Undo Announce
Follow / Undo Follow
Delete own object
addressing helper
SSE updates
unsupported-object fallback
raw AS2 inspector
```

This is the “look, it works” demo.

### Prototype B: bridge adapter

Purpose: survive the ecosystem reality.

Core features:

```text
C2S-shaped internal interface
Mastodon-compatible backend adapter
native C2S backend adapter
capability matrix
lossy mapping warnings
test fixtures for every Activity
```

This is the “we can use it today” demo.

The bridge should expose the same internal client interface as the native C2S server:

```ts
interface SocialApiClient {
  getActor(id: ActorId): Promise<Actor>;
  getCollection(id: CollectionId, page?: PageCursor): Promise<OrderedCollectionPage>;
  createObject(actor: ActorId, object: ASObject, addressing: Addressing): Promise<Activity>;
  performActivity(actor: ActorId, activity: Activity): Promise<Activity>;
  uploadMedia(actor: ActorId, file: File, metadata: MediaMetadata): Promise<ASObject>;
  subscribe(actor: ActorId, collections: CollectionId[]): AsyncIterable<CollectionEvent>;
}
```

Adapters:

```text
NativeActivityPubC2SAdapter
MastodonApiAdapter
TestMemoryAdapter
```

Do not make the UI talk directly to Mastodon entities.
Make it talk to the Social API interface.

---

## 24. What I would change in your ActivityPub codebase right now

### 1. Make ActivityStreams the canonical internal representation

Store raw AS2 JSON and normalized indexes.
Every Mastodon-compatible “status,” “account,” or “notification” should be a projection.

### 2. Implement C2S outbox POST as a real ingress path

Do not route it through an existing “create status” shortcut.
Route it through Activity parsing, actor authorization, wrapping, ID minting, side effects, persistence, and federation queueing.

### 3. Add OAuth actor-bound authorization

Tokens should be actor-bound and scope-bound.
The critical check is: “Can this token perform this Activity as this actor?”

### 4. Add media upload before trying to prove UX

A text-only client will understate C2S’s value.
Media is part of the product baseline.

### 5. Build a capability matrix

Every server/adapter should answer what it supports.
UI should reflect capability, not assume it.

### 6. Treat Mastodon API support as an adapter

Mastodon compatibility is useful.
Do not let it define your domain model.

### 7. Add SSE as a first-class read path

Polling inbox/outbox is enough for a demo, but not enough for a client people will use.

### 8. Create an AS2 normalization module

This module should handle arrays/singletons, embedded objects/IDs, context preservation, unknown types, and fallback rendering.

### 9. Add security gates before federation scale

SSRF, recursive fetch, HTML sanitization, blind-copy stripping, signature verification, delivery dedupe, rate limits, and retry queues should not be postponed.

### 10. Track the ActivityPub API Task Force

The live work is exactly where your implementation questions will land: OAuth scopes, media upload, feature discovery, rate limits, CORS, push, relationship endpoints, content collections, caching, and interop.
([github.com](https://github.com/swicg/activitypub-api))

---

## 25. The real research conclusion

The FOSDEM talk is pointing at a practical inversion:

```text
Old Fediverse client assumption:
  Build for Mastodon API first.
  Maybe ActivityPub matters underneath.

C2S-native assumption:
  Build for actor/outbox/object semantics first.
  Project into Mastodon-compatible surfaces where needed.
```

That inversion matters because the next Fediverse will not be one app type.
It will include microblogging, long-form publishing, media, groups, events, local communities, bridge actors, AI-assisted agents, moderation tooling, and protocol hybrids.
A Mastodon-shaped API can support some of that, but it will keep dragging everything back toward “statuses and timelines.”

C2S gives you a cleaner boundary:

```text
Client decides UX.
Server owns actor authority, policy, storage, and federation.
Protocol carries Activities, objects, collections, and extensible vocabularies.
```

The immediate win is not universal compatibility.
The immediate win is **measurability**.
A real client and bridge will tell you exactly what the spec lacks, exactly what servers need to expose, exactly which ActivityStreams patterns are painful, and exactly where app-specific APIs are doing hidden work.

So the implementation bet I would make is:

> Build the smallest serious C2S client that can publish, read, react, follow, upload media, and handle unsupported ActivityStreams objects gracefully.
> Pair it with a bridge adapter so it can run against today’s Mastodon-shaped ecosystem.
> Keep the canonical model ActivityPub-native.
> Then use every mismatch as input to your API profile and interop matrix.

That is the path from “underused spec surface” to actual leverage.
