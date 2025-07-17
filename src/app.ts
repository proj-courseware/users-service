import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createEventsRoutes } from "@/routes/events.router";
import { createAuthRoutes } from "@/routes/auth.router";
import { createUserRoutes } from "@/routes/user.router";
import { createOAuthRouter } from "@/routes/oauth.router";
import { adminRouter } from "@/routes/admin.router";
import { AuthController } from "@/controllers/auth.controller";
import { UserController } from "@/controllers/user.controller";
import { OAuthController } from "@/controllers/oauth.controller";
import { OAuthService } from "@/services/oauth.service";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { AuthenticationService } from "@/services/authentication.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import { MockDbRefreshTokenRepository } from "@/repositories/mockdb/refresh-token.mockdb.repository";
import { MongoDbRefreshTokenRepository } from "@/repositories/mongodb/refresh-token.mongodb.repository";
import type { AppEnv } from "@/schemas/app-env.schema";
import { globalErrorHandler } from "@/errors";
import { env } from "@/env";

export const app = new Hono<AppEnv>();

// We may want to let the API Gateway handle CORS and logging,
// but for development purposes, we can enable it here
app.use("/*", cors()); // Enable CORS for all routes
app.use(logger());

app.get("/", (c) => {
  console.log("Hello Hono!"); // Let's stop here to test the debugger (add a breakpoint here, and run the debugger)
  return c.text("Hello Hono!");
});

// Authentication routes
const authController = new AuthController();
app.route("/auth", createAuthRoutes({ authController }));

// User routes (authenticated endpoints)
const userController = new UserController();
app.route("/me", createUserRoutes({ userController }));

// OAuth routes (social login endpoints)
const userRepository =
  env.NODE_ENV === "test"
    ? new MockDbUserRepository()
    : new MongoDbUserRepository();
const refreshTokenRepository =
  env.NODE_ENV === "test"
    ? new MockDbRefreshTokenRepository()
    : new MongoDbRefreshTokenRepository();
const passwordService = new PasswordService();
const jwtService = new JWTService();
const authenticationService = new AuthenticationService(
  userRepository,
  passwordService,
  jwtService,
  refreshTokenRepository
);
const oauthService = new OAuthService();
const oauthController = new OAuthController(
  userRepository,
  jwtService,
  oauthService,
  authenticationService
);
app.route("/auth/oauth", createOAuthRouter(oauthController));

// Admin routes (admin-only endpoints)
app.route("/admin", adminRouter);

// Events SSE endpoint
app.route("/events", createEventsRoutes());

// Health check route
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 route (must be last)
app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError(globalErrorHandler);
