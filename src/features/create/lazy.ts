// Single dynamic-import boundary for the create-pin route. The bundler
// emits one chunk; both the lazy() in AppRoutes and the hover-prefetch in
// AppHeader pull from this same import, so they're guaranteed to hit the
// same chunk and the same in-memory cache.
export const loadCreatePinPage = () => import('./CreatePinPage');
