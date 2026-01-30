
//src/auth/getUserIdsbyRoleEmail.js
import { config } from "../config/env.js";

let tokenCache = null;

async function getManagementToken() {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const res = await fetch(`${config.zitadel.issuer}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization':
        'Basic ' +
        Buffer.from(
          `${config.zitadel.serviceClientId2}:${config.zitadel.serviceClientSecret2}`
        ).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: `openid urn:zitadel:iam:org:project:id:zitadel:aud`
    })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();

  tokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000
  };

  return json.access_token;
}

export async function getUserIdsByRole(role) {
  const token = await getManagementToken();
  const userIds = new Set();
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${config.zitadel.issuer}/management/v1/users/grants/_search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: { offset: offset.toString(), limit },
          queries: [{ role_key_query: { role_key: role } }]
        })
      }
    );

    const data = await res.json();

    for (const r of data.result || []) {
      if (r.userType === 'TYPE_HUMAN') {
        userIds.add(r.userId);
      }
    }

    if (!data.result || data.result.length < limit) break;
    offset += limit;
  }

  return [...userIds];
}


export async function getUserIdByEmail({ email, loginName }) {
  const token = await getManagementToken();

  const queries = [
    { type_query: { type: 'TYPE_HUMAN' } }
  ];

  if (loginName) {
    queries.push({
      login_name_query: {
        login_name: loginName,
        method: 'TEXT_QUERY_METHOD_EQUALS'
      }
    });
  } else if (email) {
    queries.push({
      email_query: {
        emailAddress: email.toLowerCase().trim(), 
        method: 'TEXT_QUERY_METHOD_EQUALS'
      }
    });
  } else {
    throw new Error('email or loginName required');
  }

  const res = await fetch(
    `${config.zitadel.issuer}/management/v1/users/_search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          offset: '0',
          limit: 1,
          asc: true
        },
        queries
      })
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return data.result?.[0]?.id || null;
}
