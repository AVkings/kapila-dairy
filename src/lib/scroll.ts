/* Tiny scroll bus — App owns Lenis and listens for these. */
export function scrollToId(target: string) {
  window.dispatchEvent(new CustomEvent("kapila:scroll", { detail: target }));
}
