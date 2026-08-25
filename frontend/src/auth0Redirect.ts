// Tracks whether Auth0 just completed an OAuth redirect back to the app.
// Set by Auth0Provider's onRedirectCallback (fires exactly once after
// handleRedirectCallback succeeds), consumed by the login button's
// auto-exchange effect. Avoids relying on URL query params, which the SDK
// cleans up via history.replaceState before React state updates settle.
let auth0RedirectComplete = false;

export function markAuth0RedirectComplete(): void {
  auth0RedirectComplete = true;
}

export function consumeAuth0Redirect(): boolean {
  if (!auth0RedirectComplete) return false;
  auth0RedirectComplete = false;
  return true;
}
