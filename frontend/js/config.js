// Fill this in with the ApiUrl output from `sam deploy` (backend/template.yaml),
// e.g. "https://abc123.execute-api.us-east-1.amazonaws.com/prod"
window.API_BASE_URL = "https://ldrcaslon1.execute-api.us-east-1.amazonaws.com/prod";

// Sign-in (js/auth.js): AuthDomain, UserPoolClientId and SiteURL outputs.
// These are public identifiers, not secrets.
window.AUTH_CONFIG = {
  domain: "aniketsurve-auth.auth.us-east-1.amazoncognito.com",
  clientId: "442gia81u4bfde2ptf1kbhoo28",
  siteUrl: "https://d3u06y39a063rh.cloudfront.net",
};
