//src/environments/environment.ts
export const environment = {
  production: false,

  oidc: {
    clientId: '347965190182109186',
    issuer: 'http://192.168.0.104:8085',
    scope: 'openid profile email offline_access',
    redirectUri: 'http://localhost:4204/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4204/signedout',
    requireHttps: false,
    strictDiscovery: false,
    strictDiscoveryDocumentValidation: false,
  },

  api: {
    baseUrl: 'http://192.168.0.104:8086/api', // ⬅ backend (you used this in curl)
  },

  
};
