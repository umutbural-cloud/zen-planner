const FALLBACK_NOTIFICATION = {
  type: "generic",
  title: "Zen Planner",
  body: "Yeni bir bildiriminiz var.",
  url: "/",
  tag: "zen-planner-notification",
};

const safeString = (value, fallback) => (
  typeof value === "string" && value.trim() ? value.trim() : fallback
);

const normalizeAppUrl = (candidate) => {
  try {
    const resolved = new URL(
      typeof candidate === "string" ? candidate : FALLBACK_NOTIFICATION.url,
      self.location.origin,
    );
    if (resolved.origin !== self.location.origin || !["http:", "https:"].includes(resolved.protocol)) {
      return FALLBACK_NOTIFICATION.url;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || FALLBACK_NOTIFICATION.url;
  } catch {
    return FALLBACK_NOTIFICATION.url;
  }
};

const parsePushPayload = (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }

  return {
    type: safeString(payload.type, FALLBACK_NOTIFICATION.type),
    title: safeString(payload.title, FALLBACK_NOTIFICATION.title),
    body: safeString(payload.body, FALLBACK_NOTIFICATION.body),
    url: normalizeAppUrl(payload.url),
    tag: safeString(payload.tag, FALLBACK_NOTIFICATION.tag),
  };
};

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.png",
    tag: payload.tag,
    data: {
      type: payload.type,
      url: payload.url,
    },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = normalizeAppUrl(event.notification.data?.url);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil((async () => {
    try {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const exactClient = windowClients.find((client) => client.url === targetUrl);
      if (exactClient) {
        await exactClient.focus();
        return;
      }

      const sameOriginClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });
      if (sameOriginClient) {
        if (typeof sameOriginClient.navigate === "function") {
          await sameOriginClient.navigate(targetUrl);
        }
        await sameOriginClient.focus();
        return;
      }

      if (typeof self.clients.openWindow === "function") {
        await self.clients.openWindow(targetUrl);
      }
    } catch {
      // A notification click must never leave an unhandled rejection behind.
    }
  })());
});
