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
 
  anon_token_secret: '97284cefa89fe1f4f7b9c67ad140f257963ced4d02b730bbf9b668874fb91273',
  
};
