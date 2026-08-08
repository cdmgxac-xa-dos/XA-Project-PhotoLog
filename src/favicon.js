// Browsers cache favicons separately from the page and routinely ignore
// normal reloads/redeploys, so a static href never reliably updates.
// __BUILD_TIME__ (injected in vite.config.js) changes on every build, so
// appending it here forces a fresh fetch after every deploy automatically
// -- no manual version bump to remember.
export function bustFaviconCache() {
  document
    .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => {
      const url = new URL(link.href, window.location.origin);
      url.searchParams.set("v", __BUILD_TIME__);
      link.href = url.toString();
    });
}
