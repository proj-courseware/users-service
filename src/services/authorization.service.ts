import type { AuthenticatedUserContextType } from "@/schemas/user.schemas";

export class AuthorizationService {
  isAdmin(user: AuthenticatedUserContextType): boolean {
    return user.globalRole === "admin";
  }

  isTeacher(user: AuthenticatedUserContextType): boolean {
    return user.globalRole === "teacher";
  }

  isStudent(user: AuthenticatedUserContextType): boolean {
    return user.globalRole === "student";
  }

  // --- User Management Permissions ---

  async canManageUsers(user: AuthenticatedUserContextType): Promise<boolean> {
    return this.isAdmin(user);
  }

  async canViewUserProfile(
    requestingUser: AuthenticatedUserContextType,
    targetUserId: string,
  ): Promise<boolean> {
    if (this.isAdmin(requestingUser)) return true;
    if (requestingUser.userId === targetUserId) return true;
    return false;
  }

  async canUpdateUserProfile(
    requestingUser: AuthenticatedUserContextType,
    targetUserId: string,
  ): Promise<boolean> {
    if (this.isAdmin(requestingUser)) return true;
    if (requestingUser.userId === targetUserId) return true;
    return false;
  }

  // --- Authentication Event Permissions ---

  async canReceiveAuthEvent(
    user: AuthenticatedUserContextType,
    eventData: { userId: string; [key: string]: unknown },
  ): Promise<boolean> {
    if (this.isAdmin(user)) return true;
    if (eventData.userId === user.userId) return true;
    return false;
  }

  // --- Add More Authentication-Related Permissions Here ---
}
