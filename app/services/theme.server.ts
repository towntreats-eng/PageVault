import { authenticate } from "../shopify.server";

export interface ThemeArchitectureStatus {
  activeThemeName: string;
  architecture: "os2" | "horizon";
}

/**
 * Detect active store theme architecture via GraphQL Admin API
 */
export async function detectShopThemeArchitecture(
  admin: any
): Promise<ThemeArchitectureStatus> {
  try {
    const response = await admin.graphql(
      `#graphql
        query getActiveTheme {
          themes(first: 5) {
            nodes {
              id
              name
              role
            }
          }
        }`
    );
    const responseJson = await response.json();
    const themes = responseJson?.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: any) => t.role === "MAIN") || themes[0];

    const themeName = mainTheme?.name || "Standard OS 2.0 Theme";

    // Detect Horizon vs OS 2.0 based on theme name signature
    const isHorizon = themeName.toLowerCase().includes("horizon");
    const architecture: "os2" | "horizon" = isHorizon ? "horizon" : "os2";

    return {
      activeThemeName: themeName,
      architecture,
    };
  } catch (err) {
    // Default safe fallback
    return {
      activeThemeName: "Shopify OS 2.0 Theme",
      architecture: "os2",
    };
  }
}
