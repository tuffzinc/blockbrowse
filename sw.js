// Scramjet STATIC — Service Worker
// Engine: Scramjet v1.1.0 (MercuryWorkshop)
// Transport: libcurl over wss://anura.pro/wisp/

importScripts('./scramjet-engine/scramjet-all.js')

const { ScramjetServiceWorker } = $scramjetLoadWorker()
const scramjet = new ScramjetServiceWorker()

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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

async function handleRequest(event) {
  await scramjet.loadConfig()

  if (!scramjet.route(event)) {
    return fetch(event.request).catch(() =>
      new Response('Network error', { status: 503 })
    )
  }

  const decoded = getDecodedUrl(event.request.url)
  if (decoded) {
    try {
      const destUrl = new URL(decoded)
      if (destUrl.protocol !== 'http:' && destUrl.protocol !== 'https:') {
        return new Response('', { status: 200 })
      }
    } catch {
      return new Response('', { status: 200 })
    }
  }

  return scramjet.fetch(event).catch(() =>
    new Response('', { status: 200 })
  )
}

self.addEventListener('fetch', (event) => {
  // Safe URL parse - non-http protocols like snssdk:// throw in new URL()
  let origin
  try {
    origin = new URL(event.request.url).origin
  } catch {
    return
  }
  if (origin !== self.location.origin) return
  event.respondWith(handleRequest(event))
})
