# Sprint 3: User Management & Profile Features - Implementation Plan

- [x] 1. Extend user repository with email management operations

  - Add addEmail method to store new email addresses with unverified status
  - Implement removeEmail method with primary email protection
  - Create setPrimaryEmail method with verification status validation
  - Build updateEmailVerificationToken method for token storage and updates
  - _Requirements: 2.1, 2.2, 2.4, 3.1_

- [x] 2. Implement email verification token operations in repository

  - Add verifyEmail method to mark emails as verified and clear tokens
  - Create findByEmailVerificationToken method for token-based user lookup
  - Implement clearExpiredVerificationTokens method for maintenance
  - Build isAccountCurrentlyLocked method enhancement for email verification context
  - _Requirements: 3.3, 3.4, 8.2, 8.4_

- [x] 3. Create email verification service with secure token generation

  - Implement IEmailVerificationService interface with all required methods
  - Build generateVerificationToken with cryptographically secure random generation
  - Create verifyEmailToken with comprehensive validation and expiry checking
  - Add resendVerificationEmail with cooldown period enforcement
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.3_

- [x] 4. Build token validation and security features

  - Implement isTokenValid with format and length validation
  - Create isTokenExpired with accurate timestamp comparison
  - Add generateSecureToken using UUID and crypto.randomBytes combination
  - Build findUserByVerificationToken with error handling and logging
  - _Requirements: 8.1, 8.3, 8.5_

- [x] 5. Implement email verification cooldown and rate limiting

  - Create cooldown logic to prevent rapid verification email requests
  - Add maxResendAttempts tracking with time-based reset
  - Implement resendCooldownMinutes enforcement with clear error messages
  - Build configuration system for verification timing parameters
  - _Requirements: 3.4, 8.6_

- [x] 6. Create email service with SMTP integration

  - Implement IEmailService interface with all email sending methods
  - Build EmailService with nodemailer SMTP transport configuration
  - Add sendVerificationEmail with template integration and error handling
  - Create sendPasswordResetEmail and sendWelcomeEmail methods
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 7. Implement email retry logic with exponential backoff

  - Build sendEmailWithRetry with configurable retry attempts and delays
  - Add exponential backoff calculation for progressive retry delays
  - Implement comprehensive error handling for SMTP connection failures
  - Create email delivery status logging with message ID tracking
  - _Requirements: 4.2, 4.5_

- [x] 8. Build email service health monitoring and configuration

  - Implement isHealthy method with SMTP connection verification
  - Add email service configuration management with environment variables
  - Create getConfig method returning sanitized configuration information
  - Build close method for proper resource cleanup and connection management
  - _Requirements: 4.4, 4.5_

- [x] 9. Create mock email service for testing environments

  - Implement MockEmailService with all IEmailService methods
  - Build email capture system with sentEmails array storage
  - Add testing utilities: getSentEmails, getLastEmail, getEmailsByType
  - Create clearSentEmails method for test isolation and cleanup
  - _Requirements: 4.6_

- [x] 10. Implement professional email templates with HTML and text versions

  - Create EmailTemplate interface with subject, html, and text properties
  - Build createVerificationEmailTemplate with professional styling and security information
  - Implement createPasswordResetEmailTemplate with clear instructions and warnings
  - Add createWelcomeEmailTemplate for post-verification user engagement
  - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [x] 11. Build email template rendering and URL generation system

  - Implement renderTemplate function with placeholder replacement logic
  - Create generateVerificationUrl with proper token encoding and frontend integration
  - Add generatePasswordResetUrl with secure token handling
  - Build template personalization with user name and dynamic content support
  - _Requirements: 10.2, 10.3, 10.6_

- [x] 12. Extend user controller with profile management endpoints

  - Implement getProfile method with sanitized user data response
  - Create updateProfile method with validation and database updates
  - Add getAccountSummary method with comprehensive account statistics
  - Build deleteAccount method with password confirmation and data cleanup
  - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.4_

- [x] 13. Implement email management endpoints in user controller

  - Create getEmails method returning email list with verification status
  - Build addEmail method with uniqueness validation and verification initiation
  - Implement removeEmail method with primary email protection
  - Add setPrimaryEmail method with verification requirement enforcement
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 14. Build email verification endpoints and resend functionality

  - Implement resendEmailVerification method with cooldown enforcement
  - Add comprehensive error handling for verification token operations
  - Create email verification status tracking and user feedback
  - Build integration between verification service and email service
  - _Requirements: 3.4, 3.5, 8.6_

- [x] 15. Implement password change functionality with security validation

  - Create changePassword method with current password verification
  - Add new password strength validation using existing password service
  - Implement refresh token revocation after password changes
  - Build password change event emission for security monitoring
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 16. Build comprehensive input validation for user management operations

  - Create validation schemas for profile updates with field-level validation
  - Implement email address validation with format and uniqueness checking
  - Add user input sanitization to prevent injection attacks
  - Build detailed validation error responses with field-specific guidance
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 17. Implement user profile security and audit features

  - Add authentication middleware integration for all user management endpoints
  - Create user context validation ensuring users can only modify their own data
  - Implement audit trail logging for profile changes and email operations
  - Build security event emission for monitoring and alerting systems
  - _Requirements: 1.6, 9.5, 9.6_

- [x] 18. Create comprehensive error handling for user management operations

  - Implement EmailAlreadyExistsError for duplicate email scenarios
  - Build VerificationTokenExpiredError with clear resolution guidance
  - Add CooldownActiveError with retry timing information
  - Create EmailDeliveryError for SMTP and email service failures
  - _Requirements: 2.6, 3.5, 4.2, 8.5_

- [x] 19. Build user management route integration and middleware composition

  - Integrate user management endpoints with existing route structure
  - Add appropriate middleware composition for validation and authentication
  - Create route-specific rate limiting for email operations
  - Implement proper HTTP status codes and response formatting
  - _Requirements: All requirements through proper HTTP integration_

- [x] 20. Implement comprehensive testing for user management features

  - Create unit tests for email verification service with token generation and validation
  - Build email service tests with SMTP integration and retry logic
  - Add user controller tests with profile management and email operations
  - Implement integration tests for complete email verification workflows
  - _Requirements: All requirements through comprehensive test coverage_

- [x] 21. Create email template testing and cross-client compatibility

  - Test email template rendering with various data combinations
  - Validate HTML email compatibility across different email clients
  - Add plain text template testing for accessibility compliance
  - Create template security testing to prevent injection attacks
  - _Requirements: 10.1, 10.4, 10.5, 10.6_

- [x] 22. Build user management performance optimization and monitoring

  - Optimize database queries for email operations with proper indexing
  - Implement email service connection pooling and resource management
  - Add performance monitoring for email verification workflows
  - Create user management metrics collection for operational insights
  - _Requirements: All requirements through performance optimization_

- [x] 23. Implement user management configuration and environment management

  - Create environment-specific configuration for email verification settings
  - Build email service configuration with SMTP settings and retry parameters
  - Add development vs production configuration for email delivery
  - Implement configuration validation with startup error handling
  - _Requirements: 4.1, 4.4, 8.2_

- [x] 24. Create user management documentation and operational guides
  - Build comprehensive API documentation for user management endpoints
  - Create email verification workflow documentation for frontend integration
  - Add troubleshooting guide for email delivery and verification issues
  - Implement operational runbook for user management maintenance tasks
  - _Requirements: All requirements through comprehensive documentation_
