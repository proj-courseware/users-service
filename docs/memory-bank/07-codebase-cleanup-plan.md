# Codebase Cleanup and Event System Enhancement Plan

## Overview

This document provides detailed task breakdown for Phase 5.5: Codebase Cleanup and Event System Enhancement, addressing critical issues identified through comprehensive codebase review.

## Critical Issues Summary

| Issue               | Impact                              | Files Affected | Priority  |
| ------------------- | ----------------------------------- | -------------- | --------- |
| Template Remnants   | Developer confusion, codebase bloat | 13 files       | 🔴 HIGH   |
| Missing Auth Events | No real-time capabilities           | 5 services     | 🔴 HIGH   |
| Note-focused Events | Wrong domain focus                  | 3 files        | 🔴 HIGH   |
| Missing Components  | Incomplete auth features            | N/A            | 🟡 MEDIUM |

## Detailed Task Breakdown

### 🗑️ Subphase 1: Template Cleanup (1-2 days)

#### Task 1.1: Remove Note-Related Schema Files

**Priority**: HIGH | **Estimated Time**: 30 minutes

- [ ] Remove `src/schemas/note.schema.ts`
- [ ] Update imports in `src/schemas/` index files if they exist
- [ ] Remove note schema exports from any central schema exports

**Dependencies**: None  
**Risk**: Low - no other auth components depend on note schemas

#### Task 1.2: Remove Note Controllers and Services

**Priority**: HIGH | **Estimated Time**: 45 minutes

- [ ] Remove `src/controllers/note.controller.ts`
- [ ] Remove `src/services/note.service.ts`
- [ ] Update any controller/service index exports
- [ ] Check for note controller imports in other files

**Dependencies**: Task 1.1  
**Risk**: Low - isolated components

#### Task 1.3: Remove Note Repository Layer

**Priority**: HIGH | **Estimated Time**: 1 hour

- [ ] Remove `src/repositories/note.repository.ts` (interface)
- [ ] Remove `src/repositories/mockdb/note.mockdb.repository.ts`
- [ ] Remove `src/repositories/mongodb/note.mongodb.repository.ts`
- [ ] Update repository index exports
- [ ] Check for note repository imports in services

**Dependencies**: Task 1.2  
**Risk**: Medium - ensure no services depend on note repositories

#### Task 1.4: Remove Note Routes

**Priority**: HIGH | **Estimated Time**: 30 minutes

- [ ] Remove `src/routes/note.router.ts`
- [ ] Update `src/app.ts` to remove note route mounting
- [ ] Update route index exports if they exist
- [ ] Verify no note routes are referenced elsewhere

**Dependencies**: Tasks 1.1-1.3  
**Risk**: Medium - ensure proper app.ts cleanup

#### Task 1.5: Remove Note Test Files

**Priority**: HIGH | **Estimated Time**: 45 minutes

- [ ] Remove `tests/schemas/note.schema.test.ts`
- [ ] Remove `tests/controllers/note-controller.test.ts`
- [ ] Remove `tests/services/note.service.test.ts`
- [ ] Remove `tests/routes/note.router.test.ts`
- [ ] Remove `tests/repositories/note.mockdb.repository.test.ts`
- [ ] Remove `tests/repositories/note.mongodb.repository.test.ts`
- [ ] Update test configuration if needed

**Dependencies**: Tasks 1.1-1.4  
**Risk**: Low - isolated test files

#### Task 1.6: Clean Up Authorization Service

**Priority**: HIGH | **Estimated Time**: 1 hour

- [ ] Review `src/services/authorization.service.ts`
- [ ] Remove note-specific authorization methods
- [ ] Update method signatures to focus on authentication resources
- [ ] Update related tests in `tests/services/authorization.service.test.ts`
- [ ] Ensure auth-specific authorization methods remain intact

**Dependencies**: Tasks 1.1-1.5  
**Risk**: High - critical authentication functionality

#### Task 1.7: Update Application Bootstrap

**Priority**: HIGH | **Estimated Time**: 30 minutes

- [ ] Update `src/app.ts` imports to remove note dependencies
- [ ] Clean up route mounting in app configuration
- [ ] Update middleware chains if note-specific middleware exists
- [ ] Verify application starts correctly
- [ ] Run basic smoke tests

**Dependencies**: All previous tasks  
**Risk**: High - application startup critical

#### Task 1.8: Remove Outdated Memory Bank

**Priority**: LOW | **Estimated Time**: 1 minute

- [ ] Remove `docs/memory-bank-old` directory

**Dependencies**: None  
**Risk**: Low - no other files depend on memory bank

### ⚡ Subphase 2: Event System Enhancement (3-4 days)

#### Task 2.1: Create Authentication Event Schemas

**Priority**: HIGH | **Estimated Time**: 2 hours

- [ ] Design authentication event type structure
- [ ] Create `AuthenticationEvent` base schema
- [ ] Define specific event types:
  - `user:registered` - New user registration
  - `user:login` - Successful login
  - `user:logout` - User logout
  - `user:login_failed` - Failed login attempt
  - `user:token_refreshed` - JWT token refresh
  - `user:password_changed` - Password change
  - `user:password_reset` - Password reset
  - `user:email_verified` - Email verification
  - `user:verification_sent` - Verification email sent
  - `user:social_login` - OAuth social login
  - `user:account_linked` - Social account linking
  - `admin:user_created` - Admin creates user
  - `admin:user_locked` - Admin locks account
  - `admin:settings_changed` - Admin changes settings

**Event Data Structure**:

```typescript
interface AuthenticationEvent {
  id: string;
  type: string;
  userId?: string;
  adminId?: string;
  timestamp: Date;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
    emailAddress?: string;
    [key: string]: unknown;
  };
}
```

**Dependencies**: None  
**Risk**: Medium - foundation for all event functionality

#### Task 2.2: Update Authentication Service Event Integration

**Priority**: HIGH | **Estimated Time**: 3 hours

- [ ] Update `AuthenticationService` to extend `BaseService`
- [ ] Add event emission to `register()` method
- [ ] Add event emission to `loginWithPassword()` method
- [ ] Add event emission to `refreshTokens()` method
- [ ] Add event emission to failed login attempts
- [ ] Update method signatures to include event metadata
- [ ] Create comprehensive tests for event emission
- [ ] Ensure backward compatibility with existing functionality

**Event Integration Points**:

```typescript
// Registration
await this.emit("user:registered", {
  userId: user.id,
  metadata: { emailAddress: user.primaryEmail, ipAddress },
});

// Login Success
await this.emit("user:login", {
  userId: user.id,
  metadata: { ipAddress, userAgent },
});

// Login Failure
await this.emit("user:login_failed", {
  metadata: { emailAddress, ipAddress, reason: "invalid_password" },
});
```

**Dependencies**: Task 2.1  
**Risk**: High - core authentication functionality

#### Task 2.3: Update Password Service Event Integration

**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] Update `PasswordService` to extend `BaseService`
- [ ] Add event emission to password change operations
- [ ] Add event emission to password reset operations
- [ ] Update related tests
- [ ] Integrate with authentication service events

**Dependencies**: Tasks 2.1, 2.2  
**Risk**: Medium - password security features

#### Task 2.4: Update Email Verification Service Event Integration

**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] Update `EmailVerificationService` to extend `BaseService`
- [ ] Add event emission to `generateVerificationToken()`
- [ ] Add event emission to `verifyEmailToken()`
- [ ] Add event emission to `resendVerificationEmail()`
- [ ] Update related tests
- [ ] Coordinate with email service integration

**Dependencies**: Tasks 2.1-2.3  
**Risk**: Medium - email verification flow

#### Task 2.5: Update OAuth Service Event Integration

**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] Update `OAuthService` to extend `BaseService`
- [ ] Add event emission to social login operations
- [ ] Add event emission to account linking operations
- [ ] Include provider information in event metadata
- [ ] Update related tests

**Dependencies**: Tasks 2.1-2.4  
**Risk**: Medium - social login functionality

#### Task 2.6: Update Admin Service Event Integration

**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] Update admin controller operations to emit events
- [ ] Add event emission to user management operations
- [ ] Add event emission to settings changes
- [ ] Add event emission to admin actions
- [ ] Include admin ID in event metadata
- [ ] Update related tests

**Dependencies**: Tasks 2.1-2.5  
**Risk**: Medium - administrative functionality

#### Task 2.7: Transform Events Router for Authentication

**Priority**: HIGH | **Estimated Time**: 3 hours

- [ ] Update `src/routes/events.router.ts` for authentication events
- [ ] Remove note-specific event handling
- [ ] Add authentication event stream endpoints:
  - `/events/auth` - All authentication events
  - `/events/auth/user/:userId` - User-specific events
  - `/events/auth/admin` - Administrative events
  - `/events/auth/security` - Security-related events
- [ ] Implement proper event filtering and authorization
- [ ] Add event subscription management
- [ ] Update related tests

**Event Stream Examples**:

```typescript
// General auth events
GET / events / auth;
// User-specific events (requires auth)
GET / events / auth / user / user123;
// Admin events (requires admin role)
GET / events / auth / admin;
```

**Dependencies**: Tasks 2.1-2.6  
**Risk**: High - real-time functionality foundation

#### Task 2.8: Update Authorization Service for Auth Events

**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] Update `src/services/authorization.service.ts`
- [ ] Remove note-specific authorization methods
- [ ] Add authentication event authorization:
  - Users can access their own events
  - Admins can access all events
  - Proper role-based event filtering
- [ ] Update event subscription permissions
- [ ] Update related tests

**Dependencies**: Task 2.7  
**Risk**: Medium - security and access control

#### Task 2.9: Update Event Schemas

**Priority**: MEDIUM | **Estimated Time**: 1 hour

- [ ] Update `src/schemas/event.schema.ts`
- [ ] Remove note-specific event schemas
- [ ] Add authentication event schemas
- [ ] Update event validation logic
- [ ] Update related tests

**Dependencies**: Tasks 2.1, 2.7  
**Risk**: Low - schema definitions

### 🔧 Subphase 3: Missing Components (2-3 days)

#### Task 3.1: Implement Session Management Service

**Priority**: MEDIUM | **Estimated Time**: 4 hours

- [ ] Create `SessionService` for session-based authentication
- [ ] Implement session creation, validation, and cleanup
- [ ] Add session storage (in-memory for development, Redis for production)
- [ ] Integrate with existing authentication flows
- [ ] Add session-related events
- [ ] Create comprehensive tests

**Dependencies**: Subphase 2 completion  
**Risk**: Medium - session security implementation

#### Task 3.2: Implement Audit Log Service

**Priority**: MEDIUM | **Estimated Time**: 3 hours

- [ ] Create `AuditLogService` for comprehensive event logging
- [ ] Implement persistent storage for authentication events
- [ ] Add audit log querying capabilities
- [ ] Create audit log admin endpoints
- [ ] Add retention and cleanup policies
- [ ] Create comprehensive tests

**Dependencies**: Subphase 2 completion  
**Risk**: Medium - data persistence and querying

#### Task 3.3: Create Real-time Auth Dashboard

**Priority**: LOW | **Estimated Time**: 4 hours

- [ ] Create admin dashboard endpoint for real-time auth monitoring
- [ ] Implement live authentication event streaming
- [ ] Add event filtering and search capabilities
- [ ] Create dashboard-specific authorization
- [ ] Add performance monitoring for event streams
- [ ] Create basic dashboard tests

**Dependencies**: Tasks 3.1, 3.2  
**Risk**: Low - non-critical feature

#### Task 3.4: Enhanced Security Events

**Priority**: LOW | **Estimated Time**: 3 hours

- [ ] Add device tracking for authentication events
- [ ] Implement suspicious activity detection
- [ ] Add security alert mechanisms
- [ ] Create security event aggregation
- [ ] Add security-specific event types
- [ ] Create security monitoring tests

**Dependencies**: Tasks 3.1-3.3  
**Risk**: Low - enhancement feature

## Testing Strategy

### Test Coverage Goals

- Maintain 90%+ test coverage after all changes
- Add comprehensive event emission tests
- Add integration tests for event flows
- Add performance tests for event streaming

### Test Categories

1. **Unit Tests**: Individual service event emission
2. **Integration Tests**: End-to-end authentication event flows
3. **Performance Tests**: Event stream performance under load
4. **Security Tests**: Event authorization and filtering

## Risk Mitigation

### High-Risk Areas

1. **Authentication Service Changes**: Core functionality modification
2. **Event System Integration**: New real-time capabilities
3. **Application Bootstrap**: Startup and routing changes

### Mitigation Strategies

1. **Incremental Implementation**: Complete subphases sequentially
2. **Comprehensive Testing**: Test each component thoroughly
3. **Backup Strategy**: Git branching for safe rollback
4. **Performance Monitoring**: Monitor event system performance

## Success Criteria

### Functional Requirements

- [ ] All template remnants removed (13 files)
- [ ] All authentication services emit appropriate events
- [ ] Real-time authentication event streaming functional
- [ ] Event authorization properly implemented
- [ ] All tests passing with maintained coverage

### Technical Requirements

- [ ] Clean, focused authentication service codebase
- [ ] Event-driven architecture for real-time capabilities
- [ ] Comprehensive audit trail for authentication operations
- [ ] Scalable event system design
- [ ] Proper separation of concerns

### Quality Requirements

- [ ] Zero ESLint errors maintained
- [ ] TypeScript strict mode compliance
- [ ] 90%+ test coverage maintained
- [ ] Performance benchmarks met
- [ ] Security standards upheld

This plan transforms the codebase from a template-based authentication service to a focused, event-driven authentication platform ready for production use.
