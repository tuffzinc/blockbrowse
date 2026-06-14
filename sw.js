// Scramjet STATIC — Service Worker
// Engine: Scramjet v1.1.0 (MercuryWorkshop)
// Transport: libcurl over wss://anura.pro/wisp/

importScripts('./scramjet-engine/scramjet-all.js')

const { ScramjetServiceWorker } = $scramjetLoadWorker()
const scramjet = new ScramjetServiceWorker()

// Derive BASE from the SW script URL
// e.g. https://user.github.io/Repo/sw.js -> https://user.github.io/Repo/
const SW_BASE = self.location.href.slice(0, self.location.href.lastIndexOf('/') + 1)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Decode a scramjet-encoded URL back to the real destination
function getDecodedUrl(reqUrl) {
  try {
    if (!scramjet.config) return null
    const prefix = self.location.origin + scramjet.config.prefix
    if (!reqUrl.startsWith(prefix)) return null
    return decodeURIComponent(reqUrl.slice(prefix.length))
  } catch {
    return null
  }
}

// Redirect to the 200.html error page (same-origin, correct BASE path)
function errorPage() {
  return new Response(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${SW_BASE}200.html">`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}

async function handleRequest(event) {
  await scramjet.loadConfig()

  if (!scramjet.route(event)) {
    return fetch(event.request).catch(() =>
      new Response('Network error', { status: 503 })
    )
  }

  // Decode the real destination URL and check for unsupported protocols
  const decoded = getDecodedUrl(event.request.url)
  if (decoded) {
    try {
      const destUrl = new URL(decoded)
      if (destUrl.protocol !== 'http:' && destUrl.protocol !== 'https:') {
        return errorPage()
      }
    } catch {
      return errorPage()
    }
  }

  return scramjet.fetch(event).catch(() => errorPage())
}

self.addEventListener('fetch', (event) => {
  let origin
  try {
    origin = new URL(event.request.url).origin
  } catch {
    return
  }
  if (origin !== self.location.origin) return
  event.respondWith(handleRequest(event))
})
