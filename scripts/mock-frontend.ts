import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

// Serve the /verify-email page
app.get("/verify-email", (c) => {
  // Serve a minimal HTML page with JS to call the backend
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Verification</title>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .loading { text-align: center; color: #666; }
        .success { color: #2e7d32; background: #e8f5e8; padding: 15px; border-radius: 4px; }
        .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div id="content">
        <div class="loading">
          <h1>Verifying Email...</h1>
          <p>Please wait while we verify your email address.</p>
        </div>
      </div>
      <script>
        async function verifyEmail() {
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');
          if (!token) {
            showError('No verification token found in URL');
            return;
          }
          try {
            const response = await fetch('http://localhost:3000/auth/verify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });
            const result = await response.json();
            if (result.success) {
              showSuccess(result.message, result.user);
            } else {
              showError(result.message || 'Verification failed');
            }
          } catch (error) {
            showError('Network error: ' + error.message);
          }
        }
        function showSuccess(message, user) {
          document.getElementById('content').innerHTML =
            '<h1>✅ Email Verified Successfully!</h1>' +
            '<div class="success">' +
              '<p>' + message + '</p>' +
              '<p><strong>Welcome, ' + (user?.firstName || '') + ' ' + (user?.lastName || '') + '!</strong></p>' +
              '<p>Your email ' + (user?.primaryEmail || '') + ' has been verified.</p>' +
            '</div>';
        }
        function showError(message) {
          document.getElementById('content').innerHTML =
            '<h1>❌ Verification Failed</h1>' +
            '<div class="error">' +
              '<p>' + message + '</p>' +
            '</div>';
        }
        verifyEmail();
      </script>
    </body>
    </html>
  `);
});

// Optionally, serve a root page with a link for convenience
defaultRoot();
function defaultRoot() {
  app.get("/", (c) =>
    c.html(
      "<h2>Mock Frontend Running</h2><p>Use <code>/verify-email?token=...</code> to test email verification.</p>"
    )
  );
}

serve({ fetch: app.fetch, port: 3001 });
console.log("Mock frontend running on http://localhost:3001");
