// Remove any existing CSP meta tag and replace with a permissive one for dev server mode.
const existingPolicyEl = document.querySelector<HTMLMetaElement>(
  'meta[http-equiv="Content-Security-Policy"]',
);
if (existingPolicyEl) existingPolicyEl.remove();

const policyEl = document.createElement('meta');
policyEl.setAttribute('http-equiv', 'Content-Security-Policy');
const policy =
  "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: gap: ionic: ws: wss: blob:;" +
  " style-src * 'self' 'unsafe-inline';" +
  " script-src * 'self' 'unsafe-inline' 'unsafe-eval';" +
  " img-src * 'self' data: blob: ionic:;" +
  " connect-src * 'self' ws: wss:;" +
  " font-src * 'self' data:;";
policyEl.setAttribute('content', policy);
document.head.appendChild(policyEl);

console.log('Set Content Security Policy:', policy);
