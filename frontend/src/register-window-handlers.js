/** Assign onclick handlers from HTML templates to window (esbuild IIFE scope). */
export function registerWindowHandlers(handlers) {
    Object.assign(window, handlers);
}
