import { createMiddleware } from "hono/factory";
import type { AppEnv } from "@/schemas/app-env.schema";
import { AuthenticationService } from "@/services/authentication.service";
import { MockDbUserRepository } from "@/repositories/mockdb/user.mockdb.repository";
import { MongoDbUserRepository } from "@/repositories/mongodb/user.mongodb.repository";
import { PasswordService } from "@/services/password.service";
import { JWTService } from "@/services/jwt.service";
import { env } from "@/env";
import { UnauthenticatedError } from "@/errors";

class TokenError extends UnauthenticatedError {
  constructor() {
    super("Authorization header is missing or invalid.");
  }
}

export interface AuthMiddlewareDeps {
  authenticationService: AuthenticationService;
}

// Factory function to create the auth middleware with injectable dependencies
export const createAuthMiddleware = (deps: AuthMiddlewareDeps) => {
  const { authenticationService } = deps;

  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) throw new TokenError();

    const parts = authHeader.split(" ");
    let token: string | undefined;

    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
    }
    if (!token) throw new TokenError();

    // Will throw errors if it cannot authenticate
    const user = await authenticationService.authenticateUserByToken(token);

    c.set("user", user);
    await next();
  });
};

// Create default services for the default auth middleware
const userRepository = env.NODE_ENV === "test" 
  ? new MockDbUserRepository() 
  : new MongoDbUserRepository();
const passwordService = new PasswordService();
const jwtService = new JWTService();
const defaultAuthenticationService = new AuthenticationService(
  userRepository,
  passwordService,
  jwtService,
);

export const authMiddleware = createAuthMiddleware({
  authenticationService: defaultAuthenticationService,
});
