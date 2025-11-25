export const environment = {
  production: true,

  oauth: {
    clientId: 'YOUR_PROD_CLIENT_ID',
    issuer: 'https://auth.techsavvylab.com',
    redirectUri: 'https://iot.techsavvylab.com/auth/callback',
    postLogoutRedirectUri: 'https://iot.techsavvylab.com/signedout',
    requireHttps: true,
    strictDiscoveryDocumentValidation: true,
  }
};
