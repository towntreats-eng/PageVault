import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/agent">AI SEO Agent</Link>
        <Link to="/app/products">Products</Link>
        <Link to="/app/images">Image SEO</Link>
        <Link to="/app/schema">Schema & AEO</Link>
        <Link to="/app/redirects">301 Redirects</Link>
        <Link to="/app/sitemap">Sitemap & Robots</Link>
        <Link to="/app/keywords">Keywords</Link>
        <Link to="/app/competitors">Competitors</Link>
        <Link to="/app/theme">Theme Copy</Link>
        <Link to="/app/gsc">Google Search Console</Link>
        <Link to="/app/blog">Blog SEO</Link>
        <Link to="/app/history">History & Rollback</Link>
        <Link to="/app/plans">Plans & Quotas</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();

  try {
    return boundary.error(error);
  } catch (err: any) {
    console.error("[App Root ErrorBoundary caught]", err);
    return (
      <div
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "32px 24px",
          maxWidth: "760px",
          margin: "40px auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e1e3e5",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            padding: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#202223" }}>
              ShopForge Encountered an Issue
            </h2>
          </div>
          <p style={{ color: "#6d7175", fontSize: "14px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
            An unexpected error occurred while rendering the app. This is usually temporary and can be resolved by reloading the page.
          </p>
          {(err?.message || (error as any)?.message) && (
            <div
              style={{
                background: "#fff4f4",
                border: "1px solid #fed7d7",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "13px",
                color: "#c53030",
                fontFamily: "monospace",
                marginBottom: "20px",
                wordBreak: "break-word",
              }}
            >
              {err?.message || (error as any)?.message}
            </div>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#008060",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
            <a
              href="/app"
              style={{
                background: "#f1f2f3",
                color: "#202223",
                borderRadius: "6px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
