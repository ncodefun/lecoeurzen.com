# Browser connection failures

When the browser connection fails at the local sandbox or browser-bridge layer:

1. Retry the browser connection once.
2. If that retry fails, stop all browser-dependent work immediately.
3. Do not substitute Electron, standalone Playwright, screenshots, Computer Use, or another browser-control path.
4. Give the user a useful error report that includes:
   - the connection stage that failed;
   - the concise underlying error and relevant log path, when available;
   - the most likely local cause;
   - practical checks the user can perform before asking for another retry.
5. Wait for the user to assess or resolve the issue before attempting the browser connection again.
