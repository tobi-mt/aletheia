import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aletheia</title></head>
<body><script>
(async function () {
  try {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    const csrf = await csrfResponse.json();
    if (!csrf.csrfToken) throw new Error('Missing CSRF token');

    // Submit as a browser navigation instead of fetching the provider URL in
    // the background. iOS must commit NextAuth's short-lived state and PKCE
    // cookies before Google redirects back to the callback.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signin/google';
    for (const [name, value] of Object.entries({
      csrfToken: csrf.csrfToken,
      callbackUrl: location.origin + '/api/auth/oauth/complete?native=1'
    })) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
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
