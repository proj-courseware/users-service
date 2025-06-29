import { Hono } from "hono";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { IOAuthController } from "@/controllers/oauth.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { globalErrorHandler } from "@/errors";

export function createOAuthRouter(oauthController: IOAuthController) {
  const router = new Hono<AppEnv>();

  router.get("/providers", async (c) => {
    return oauthController.getEnabledProviders(c);
  });

  router.get("/:provider", async (c) => {
    return oauthController.initiateOAuth(c);
  });

  router.get("/:provider/callback", async (c) => {
    return oauthController.handleOAuthCallback(c);
  });

  router.delete("/:provider", authMiddleware, async (c) => {
    return oauthController.unlinkOAuthProvider(c);
  });

  router.onError(globalErrorHandler);

  return router;
}