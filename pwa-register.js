const isServiceWorkerOrigin =
  location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && isServiceWorkerOrigin) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("A Ritmus offline módja nem indult el:", error);
    });
  });
}
