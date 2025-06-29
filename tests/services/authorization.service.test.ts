import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthorizationService } from "@/services/authorization.service";
import type { AuthenticatedUserContextType } from "@/schemas/user.schemas";

const adminUser: AuthenticatedUserContextType = {
  userId: "admin-1",
  globalRole: "admin",
};

const teacherUser: AuthenticatedUserContextType = {
  userId: "teacher-1",
  globalRole: "teacher",
};

const studentUser: AuthenticatedUserContextType = {
  userId: "student-1",
  globalRole: "student",
};

const otherStudentUser: AuthenticatedUserContextType = {
  userId: "student-2", 
  globalRole: "student",
};

describe("AuthorizationService", () => {
  let service: AuthorizationService;

  beforeEach(() => {
    service = new AuthorizationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Role Checks", () => {
    describe("isAdmin", () => {
      it("returns true for admin", () => {
        expect(service.isAdmin(adminUser)).toBe(true);
      });
      it("returns false for teacher", () => {
        expect(service.isAdmin(teacherUser)).toBe(false);
      });
      it("returns false for student", () => {
        expect(service.isAdmin(studentUser)).toBe(false);
      });
    });

    describe("isTeacher", () => {
      it("returns true for teacher", () => {
        expect(service.isTeacher(teacherUser)).toBe(true);
      });
      it("returns false for admin", () => {
        expect(service.isTeacher(adminUser)).toBe(false);
      });
      it("returns false for student", () => {
        expect(service.isTeacher(studentUser)).toBe(false);
      });
    });

    describe("isStudent", () => {
      it("returns true for student", () => {
        expect(service.isStudent(studentUser)).toBe(true);
      });
      it("returns false for admin", () => {
        expect(service.isStudent(adminUser)).toBe(false);
      });
      it("returns false for teacher", () => {
        expect(service.isStudent(teacherUser)).toBe(false);
      });
    });
  });

  describe("User Management Permissions", () => {
    describe("canManageUsers", () => {
      it("allows admin to manage users", async () => {
        await expect(service.canManageUsers(adminUser)).resolves.toBe(true);
      });
      it("denies teacher from managing users", async () => {
        await expect(service.canManageUsers(teacherUser)).resolves.toBe(false);
      });
      it("denies student from managing users", async () => {
        await expect(service.canManageUsers(studentUser)).resolves.toBe(false);
      });
    });

    describe("canViewUserProfile", () => {
      it("allows admin to view any user profile", async () => {
        await expect(
          service.canViewUserProfile(adminUser, studentUser.userId),
        ).resolves.toBe(true);
      });
      it("allows user to view their own profile", async () => {
        await expect(
          service.canViewUserProfile(studentUser, studentUser.userId),
        ).resolves.toBe(true);
      });
      it("denies user from viewing other user's profile", async () => {
        await expect(
          service.canViewUserProfile(studentUser, otherStudentUser.userId),
        ).resolves.toBe(false);
      });
    });

    describe("canUpdateUserProfile", () => {
      it("allows admin to update any user profile", async () => {
        await expect(
          service.canUpdateUserProfile(adminUser, studentUser.userId),
        ).resolves.toBe(true);
      });
      it("allows user to update their own profile", async () => {
        await expect(
          service.canUpdateUserProfile(studentUser, studentUser.userId),
        ).resolves.toBe(true);
      });
      it("denies user from updating other user's profile", async () => {
        await expect(
          service.canUpdateUserProfile(studentUser, otherStudentUser.userId),
        ).resolves.toBe(false);
      });
    });
  });

  describe("Authentication Event Permissions", () => {
    describe("canReceiveAuthEvent", () => {
      it("allows admin to receive any authentication event", async () => {
        const eventData = { userId: "other-user", action: "login" };
        await expect(
          service.canReceiveAuthEvent(adminUser, eventData),
        ).resolves.toBe(true);
      });

      it("allows user to receive their own authentication events", async () => {
        const eventData = { userId: studentUser.userId, action: "login" };
        await expect(
          service.canReceiveAuthEvent(studentUser, eventData),
        ).resolves.toBe(true);
      });

      it("denies user from receiving other users' authentication events", async () => {
        const eventData = { userId: otherStudentUser.userId, action: "login" };
        await expect(
          service.canReceiveAuthEvent(studentUser, eventData),
        ).resolves.toBe(false);
      });
    });
  });
});
