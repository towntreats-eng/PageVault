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
        <Link to="/app" rel="home">
          🔍 SEO Checker
        </Link>
        <Link to="/app/analytics">🎯 Keyword Research & Ranks</Link>
        <Link to="/app/images">🖼️ Image & Speed Optimizer</Link>
        <Link to="/app/meta">📝 Meta Tags & Content AI</Link>
        <Link to="/app/schema">🏷️ JSON-LD Schema Markup</Link>
        <Link to="/app/speed">🔗 301 Redirects & Link Fixer</Link>
        <Link to="/app/additional">🤖 AI Search Visibility & Autopilot</Link>
        <Link to="/app/billing">💳 Plans & Pricing ($29/mo)</Link>
        <Link to="/app/submission">🚀 Submission & Compliance</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
