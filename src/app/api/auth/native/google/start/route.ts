import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aletheia</title></head>
<body><script>
(async function () {
  try {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    const csrf = await csrfResponse.json();
    const body = new URLSearchParams({
      csrfToken: csrf.csrfToken,
      callbackUrl: location.origin + '/api/auth/oauth/complete?native=1',
      json: 'true'
    });
    const response = await fetch('/api/auth/signin/google', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
      body
    });
    const result = await response.json();
    if (!result.url) throw new Error('Missing provider URL');
    location.replace(result.url);
  } catch (error) {
    location.replace('com.aletheia.app://auth/callback?error=start_failed');
  }
})();
</script></body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });
}
