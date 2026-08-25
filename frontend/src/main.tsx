/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { BrowserRouter} from 'react-router';
import { Auth0Provider } from '@auth0/auth0-react';
import { markAuth0RedirectComplete } from './auth0Redirect';

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;
const isAuth0Configured =
  !!auth0Domain &&
  !!auth0ClientId &&
  auth0Domain !== "YOUR_AUTH0_DOMAIN" &&
  auth0ClientId !== "YOUR_AUTH0_CLIENT_ID" &&
  auth0Domain !== "" &&
  auth0ClientId !== "";

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

const auth0RedirectUri = `${window.location.origin}/login`;

function Providers({ children }: { children: React.ReactNode }) {
  let node = children;
  if (isAuth0Configured) {
    node = (
      <Auth0Provider
        domain={auth0Domain!}
        clientId={auth0ClientId!}
        authorizationParams={{
          redirect_uri: auth0RedirectUri,
          ...(auth0Audience ? { audience: auth0Audience } : {}),
          scope: "openid profile email",
        }}
        cacheLocation="localstorage"
        onRedirectCallback={() => {
          // Fires exactly once after the OAuth redirect is handled.
          markAuth0RedirectComplete();
          // Replicate SDK default: strip code/state from the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      >
        {node}
      </Auth0Provider>
    );
  }
  return <>{node}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>{app}</Providers>
  </StrictMode>,
)
