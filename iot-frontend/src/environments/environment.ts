//src/environments/environment.ts
export const environment = {
  production: false,

  oauth: {
    clientId: '347965190182109186',
    issuer: 'http://192.168.0.104:8085',
    redirectUri: 'http://192.168.0.104:4200/auth/callback',
    postLogoutRedirectUri: 'http://192.168.0.104:4200/signedout',
    requireHttps: false,
    strictDiscoveryDocumentValidation: false,
  },

  api: {
    baseUrl: 'http://192.168.0.104:8086/api', // ⬅ backend (you used this in curl)
  },

  
};
