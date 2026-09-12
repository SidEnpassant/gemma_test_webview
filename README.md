# webchat

The chat page the app opens in a webview. Two static files, no build step, no
backend. Bundled in the APK **and** meant to be served from GitHub Pages — the
same files either way.

| | |
|---|---|
| `index.html` | The UI and the bridge to the app. |
| `policy.js` | **The decision.** Whether a device can host a model, and why. |
| `policy.test.js` | `node webchat/policy.test.js` — not published. |

The app measures and reports; this page decides. That split is the point: the
rule lives on the web side so it can change by redeploying a static file, with
no APK release, and so the orchestration backend can take it over later by
replacing `policy.js` with a call to itself. The app keeps sending the same raw
facts and keeps doing what it is told.

## Publish

GitHub Pages can only serve from a repo root or `/docs`, so put `index.html` at
the root of its own repo:

```bash
gh repo create gemma-webchat --public --clone && cd gemma-webchat
cp ../gemma_local_app/webchat/index.html ../gemma_local_app/webchat/policy.js .
git add index.html policy.js && git commit -m "Chat page" && git push
gh api -X POST repos/:owner/gemma-webchat/pages -f source[branch]=main -f source[path]=/
```

`policy.js` must sit next to `index.html`; the page loads it by relative path
and says so plainly if it is missing rather than deciding anything without it.

Then point the app at it without touching any code:

```bash
flutter run --dart-define=WEBCHAT_URL=https://<you>.github.io/gemma-webchat/
```

Leave `WEBCHAT_URL` unset and the app loads the bundled copy instead, which is
what makes this runnable before anything is published.

Open the URL in a plain browser and it says "no app" — correct, it has no device
and no model on its own. Add `?demo=1` (or `?demo=1&ram=2048`) to fake a device
and a download so the hosted page can be checked without a phone; it labels
itself DEMO DATA when it does.

Demo mode cannot run inside the app. It needs both a missing `GemmaHost` channel
and an explicit `?demo=` — the app injects the channel and loads the page with no
query string, so either guard alone is enough. Real numbers come from
`device_info_plus` (`ActivityManager.MemoryInfo.totalMem` on Android,
`physicalRamSize` on iOS) and are never computed in the page.

## Bridge

`window.GemmaHost.postMessage(json)` — page to app. `window.GemmaBridge.receive(json)`
— app to page. The app sends nothing until it has heard `ready`, so a reload
always re-syncs.

| Page sends | |
|---|---|
| `{type:'ready'}` | Page is up. App replies with `device`, `status`, `transcript`. |
| `{type:'prepare'}` | Download the model if missing, then load it. |
| `{type:'chat', text}` | One turn. |
| `{type:'reset'}` | Clear the transcript. |

| App sends | |
|---|---|
| `{type:'device', device:{platform, model, manufacturer, os, ramMB, hardware, lowRamDevice}}` | Measurements only — no verdict. Once per handshake. |
| `{type:'status', state, progress, name, size, message}` | `absent`, `downloading`, `installed`, `loading`, `ready`, `error`. |
| `{type:'transcript', busy, messages:[…]}` | Whole transcript on every change. Roles: `user`, `model`, `action`. |

`ramMB` is 0 when the platform has no figure to give (desktop, web). `policy.js`
reads that as "cannot tell" and refuses — unknown is not a yes.

None of this is measured in the browser. `navigator.deviceMemory` snaps to a
power of two and does not exist on iOS, so it cannot answer a 4 GB question;
the app reads `ActivityManager.MemoryInfo.totalMem` / `physicalRamSize` and
sends the real number. Measurement is native, the decision is here.

`hardware` is `Build.HARDWARE` — the closest thing to an SoC name without a
platform channel. Nothing uses it yet. It is in the payload because the real
constraint is not RAM: a MediaTek part and a Snapdragon with the same memory do
not behave the same on LiteRT-LM, and that is the call the backend will need to
make.
