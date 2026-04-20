/**
 * Vollbild für den Spiel-Container (zuverlässiger als nur scale.startFullscreen() in manchen Browsern).
 * Nur nach Nutzeraktion aufrufen (Klick, Taste).
 */

export function isGameFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * @returns {Promise<boolean>} true, wenn die Anfrage gestartet wurde (Erfolg oder schon aktiv)
 */
export async function toggleGameFullscreen() {
  const el = document.getElementById("game-root");
  if (!el) {
    return false;
  }

  try {
    if (isGameFullscreen()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      return true;
    }

    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (req) {
      await req.call(el);
      return true;
    }
  } catch (err) {
    console.warn("[Vollbild] Nicht möglich:", err?.message ?? err);
  }
  return false;
}
