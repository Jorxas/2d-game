/**
 * Fichiers servis depuis public/kenney_pixel-platformer/ (même arborescence que le pack Kenney officiel).
 * Téléchargement : https://kenney.nl/assets/pixel-platformer (CC0)
 */
export function kenneyUrl(relativePath) {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const p = relativePath.replace(/^\/+/, "");
  return `${normalizedBase}kenney_pixel-platformer/${p}`;
}
