/** Speicherstand-Version — Migration von v1 in MainMenuScene. */
export const SAVE_KEY = "swordigo-clone-save-v2";
export const SAVE_KEY_V1 = "swordigo-clone-save-v1";

export function defaultStoryFlags() {
  return {
    ruinsPuzzleSolved: false,
    puzzleSequence: [],
    plainePlaque: false,
  };
}
