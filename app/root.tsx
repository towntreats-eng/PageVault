import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[Root ErrorBoundary]", error);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>ShopForge - Error</title>
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
      </head>
      <body
        style={{
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: "48px 24px",
          background: "#f6f6f7",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e1e3e5",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            padding: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span style={{ fontSize: "28px" }}>🔧</span>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#202223" }}>
              ShopForge Error
            </h1>
          </div>
          <p style={{ color: "#6d7175", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
            Something went wrong while loading the app. This is usually temporary. Try reloading
            or navigating back to your Shopify admin.
          </p>
          {(error as any)?.message && (
            <pre
              style={{
                background: "#fff4f4",
                border: "1px solid #fed7d7",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "12px",
                color: "#c53030",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                marginBottom: "24px",
                overflow: "auto",
                maxHeight: "120px",
              }}
            >
              {(error as any).message}
            </pre>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#008060",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
