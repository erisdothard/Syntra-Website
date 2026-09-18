/** `?diag` on any build shows the player's live numbers (FrameDiag), for machines we cannot profile ourselves. */
export const isDiag = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('diag')
