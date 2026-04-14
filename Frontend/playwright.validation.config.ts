import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.no-webserver.config";

export default defineConfig({
  ...baseConfig,
  webServer: undefined,
});
