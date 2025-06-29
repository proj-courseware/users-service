import { Hono } from "hono";
import { appEvents } from "@/events/event-emitter";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { AuthorizationService } from "@/services/authorization.service";
import type { AppEnv } from "@/schemas/app-env.schema";
import type { ServiceEventType } from "@/schemas/event.schema";
import type { AuthenticatedUserContextType } from "@/schemas/user.schemas";
import { authMiddleware as defaultAuthMiddleware } from "@/middlewares/auth.middleware";

// Add interface for controller with cleanup function
interface SSEController extends ReadableStreamDefaultController<Uint8Array> {
  cleanup?: () => void;
}

interface EventsRouteOptions {
  authMiddleware?: typeof defaultAuthMiddleware;
}

export function createEventsRoutes(options?: EventsRouteOptions) {
  const router = new Hono<AppEnv>();

  // Use injected middleware or default
  const authMiddlewareToUse = options?.authMiddleware || authMiddleware;

  router.get("/", authMiddlewareToUse, async (c) => {
    const currentUser = c.var.user;
    if (!currentUser) {
      return c.text("Unauthorized", 401);
    }

    const authorizationService = new AuthorizationService();

    // Return a Response with a ReadableStream
    const readable = new ReadableStream({
      start(controller: SSEController) {
        // Send initial connection message
        controller.enqueue(
          new TextEncoder().encode(
            `data: {"type":"connected","message":"Authentication events stream ready"}\n\n`,
          ),
        );

        const eventHandler = async (event: ServiceEventType) => {
          try {
            const canReceive = await shouldUserReceiveEvent(
              event,
              currentUser,
              authorizationService,
            );
            if (canReceive) {
              const eventData = `event: ${event.resourceType}:${event.action}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(new TextEncoder().encode(eventData));
            }
          } catch (error: unknown) {
            console.error(
              "Error in event handler:",
              error instanceof Error ? error.message : String(error),
            );
          }
        };

        // Authentication event listeners
        const authEventTypes = [
          // User lifecycle events
          "users:registered",
          "users:updated",
          "users:deleted",
          // Authentication events
          "authentication:login",
          "authentication:logout",
          "authentication:token_refreshed",
          // Email events
          "email:email_verified",
          "email:email_added",
          "email:email_removed",
          "email:verification_sent",
          // Password events
          "password:password_changed",
          "password:password_reset_requested",
          "password:password_reset_completed",
          // OAuth events
          "oauth:oauth_login",
          "oauth:oauth_account_linked",
          "oauth:oauth_account_unlinked",
          // Security events
          "security:account_locked",
          "security:account_unlocked",
          "security:failed_login_attempt",
          // Admin events
          "admin:user_role_changed",
          "admin:admin_action_performed",
        ];

        // Register event listeners
        authEventTypes.forEach((eventType) => {
          appEvents.on(eventType, eventHandler);
        });

        // Keep connection alive with heartbeat
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
          } catch (error: unknown) {
            console.error(
              "Heartbeat error:",
              error instanceof Error ? error.message : String(error),
            );
            clearInterval(keepAlive);
          }
        }, 30000);

        // Store cleanup function
        controller.cleanup = () => {
          authEventTypes.forEach((eventType) => {
            appEvents.off(eventType, eventHandler);
          });
          clearInterval(keepAlive);
        };
      },
      cancel(controller: SSEController) {
        // Cleanup when client disconnects
        if (controller.cleanup) {
          controller.cleanup();
        }
      },
    });

    // Set SSE headers directly on the Response object
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization",
      },
    });
  });

  return router;
}

async function shouldUserReceiveEvent(
  event: ServiceEventType,
  user: AuthenticatedUserContextType,
  authorizationService: AuthorizationService,
): Promise<boolean> {
  // Resource-specific authorization logic for authentication events
  switch (event.resourceType) {
    case "users":
    case "authentication":
    case "email":
    case "password":
    case "oauth":
    case "security":
      // For authentication events, use the updated authorization service
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        "userId" in event.data
      ) {
        return await authorizationService.canReceiveAuthEvent(
          user,
          event.data as { userId: string; [key: string]: unknown },
        );
      }
      return false;
    case "admin":
      // Admin events are only visible to admins or the affected user
      if (authorizationService.isAdmin(user)) {
        return true;
      }
      // If it's about the current user, they can see it
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        "targetUserId" in event.data &&
        event.data.targetUserId === user.userId
      ) {
        return true;
      }
      return false;
    default:
      // Unknown resource types are not allowed
      return false;
  }
}
