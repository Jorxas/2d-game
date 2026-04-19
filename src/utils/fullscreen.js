/**
 * Plein écran sur le conteneur du jeu (plus fiable que scale.startFullscreen() seul sur certains navigateurs).
 * À appeler depuis un geste utilisateur (clic, touche).
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
 * @returns {Promise<boolean>} true si la demande a été lancée (succès ou déjà en cours)
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
    console.warn("[Fullscreen] Impossible:", err?.message ?? err);
  }
  return false;
}
