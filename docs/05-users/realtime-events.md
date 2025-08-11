# Real-time Events (Server-Sent Events)

The Authentication Service provides real-time event streaming using Server-Sent Events (SSE) to notify clients of authentication-related activities as they occur.

## Overview

The `/events` endpoint provides a continuous stream of authentication events using the Server-Sent Events (SSE) protocol. This allows applications to receive real-time notifications about user activities, security events, and system changes.

**Endpoint:** `GET /events`  
**Authentication:** Bearer token required  
**Response Type:** `text/event-stream`

## Event Types

### User Events

**users:registered**

```
event: users:registered
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "globalRole": "student",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

**users:updated**

```
event: users:updated
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "changes": ["firstName", "lastName"],
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**users:deleted**

```
event: users:deleted
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "deletedBy": "admin-456"
}
```

### Authentication Events

**authentication:login**

```
event: authentication:login
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "loginMethod": "email",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**authentication:logout**

```
event: authentication:logout
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**authentication:token_refreshed**

```
event: authentication:token_refreshed
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

### Email Events

**email:email_verified**

```
event: email:email_verified
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "verifiedEmail": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**email:verification_sent**

```
event: email:verification_sent
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "sentTo": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**email:email_added**

```
event: email:email_added
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "addedEmail": "john.work@company.com",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**email:email_removed**

```
event: email:email_removed
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "removedEmail": "old@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Password Events

**password:password_changed**

```
event: password:password_changed
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

**password:password_reset_requested**

```
event: password:password_reset_requested
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

### OAuth Events

**oauth:oauth_login**

```
event: oauth:oauth_login
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "provider": "google",
  "providerId": "google-user-id",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

**oauth:oauth_account_linked**

```
event: oauth:oauth_account_linked
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "provider": "github",
  "providerId": "github-username",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**oauth:oauth_account_unlinked**

```
event: oauth:oauth_account_unlinked
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "provider": "linkedin",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Security Events

**security:account_locked**

```
event: security:account_locked
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "lockoutLevel": 2,
  "lockoutUntil": "2025-01-01T11:00:00.000Z",
  "failedAttempts": 6,
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

**security:failed_login_attempt**

```
event: security:failed_login_attempt
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "attemptNumber": 3,
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

**security:account_unlocked**

```
event: security:account_unlocked
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "unlockedBy": "admin-456",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Admin Events

**admin:user_role_changed**

```
event: admin:user_role_changed
data: {
  "userId": "user-123",
  "email": "john@example.com",
  "oldRole": "student",
  "newRole": "teacher",
  "changedBy": "admin-456",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

**admin:admin_action_performed**

```
event: admin:admin_action_performed
data: {
  "adminId": "admin-456",
  "action": "user_created",
  "targetUserId": "user-123",
  "details": "Created new teacher account",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

## Client Implementation

### Basic EventSource Connection

```javascript
// Basic connection setup
const accessToken = localStorage.getItem("accessToken");

const eventSource = new EventSource("/events", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// Listen for connection events
eventSource.onopen = function (event) {
  console.log("EventSource connected");
};

eventSource.onerror = function (event) {
  console.error("EventSource error:", event);
};

// Listen for specific event types
eventSource.addEventListener("authentication:login", function (event) {
  const data = JSON.parse(event.data);
  console.log("User login:", data);
});
```

### Advanced Event Client

```javascript
class AuthEventClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
    this.isConnected = false;
  }

  connect() {
    try {
      this.eventSource = new EventSource("/events", {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      this.handleReconnect();
    }
  }

  setupEventListeners() {
    // Connection events
    this.eventSource.onopen = (event) => {
      console.log("Event stream connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connected", event);
    };

    this.eventSource.onerror = (error) => {
      console.error("Event stream error:", error);
      this.isConnected = false;
      this.emit("error", error);
      this.handleReconnect();
    };

    // Register all event type listeners
    this.registerEventListeners();
  }

  registerEventListeners() {
    const eventTypes = [
      // User events
      "users:registered",
      "users:updated",
      "users:deleted",

      // Auth events
      "authentication:login",
      "authentication:logout",
      "authentication:token_refreshed",

      // Email events
      "email:email_verified",
      "email:verification_sent",
      "email:email_added",
      "email:email_removed",

      // Password events
      "password:password_changed",
      "password:password_reset_requested",

      // OAuth events
      "oauth:oauth_login",
      "oauth:oauth_account_linked",
      "oauth:oauth_account_unlinked",

      // Security events
      "security:account_locked",
      "security:failed_login_attempt",
      "security:account_unlocked",

      // Admin events
      "admin:user_role_changed",
      "admin:admin_action_performed",
    ];

    eventTypes.forEach((eventType) => {
      this.eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(eventType, data);
        } catch (error) {
          console.error(`Failed to parse event data for ${eventType}:`, error);
        }
      });
    });
  }

  // Event handler management
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

      console.log(
        `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts exceeded");
      this.emit("maxReconnectAttemptsExceeded");
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.emit("disconnected");
    }
  }

  updateToken(newAccessToken) {
    this.accessToken = newAccessToken;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}
```

### Usage Examples

#### Basic Usage

```javascript
// Initialize event client
const eventClient = new AuthEventClient(localStorage.getItem("accessToken"));

// Handle specific events
eventClient.on("authentication:login", (data) => {
  console.log(`User ${data.email} logged in from ${data.ipAddress}`);
  updateLoginStatus(data);
});

eventClient.on("security:account_locked", (data) => {
  console.log(`Account ${data.email} locked until ${data.lockoutUntil}`);
  showSecurityAlert(data);
});

eventClient.on("email:email_verified", (data) => {
  console.log(`Email ${data.verifiedEmail} verified`);
  updateEmailStatus(data);
});

// Connect to event stream
eventClient.connect();
```

#### React Integration

```jsx
import { useEffect, useState } from "react";

function useAuthEvents(accessToken) {
  const [eventClient, setEventClient] = useState(null);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const client = new AuthEventClient(accessToken);

    // Connection status
    client.on("connected", () => setIsConnected(true));
    client.on("disconnected", () => setIsConnected(false));
    client.on("error", () => setIsConnected(false));

    // Store all events
    const eventTypes = [
      "users:registered",
      "authentication:login",
      "security:account_locked",
      "email:email_verified",
      "oauth:oauth_login",
    ];

    eventTypes.forEach((eventType) => {
      client.on(eventType, (data) => {
        setEvents((prev) => [
          ...prev,
          { type: eventType, data, timestamp: new Date() },
        ]);
      });
    });

    client.connect();
    setEventClient(client);

    return () => {
      client.disconnect();
    };
  }, [accessToken]);

  // Update token when it changes
  useEffect(() => {
    if (eventClient && accessToken) {
      eventClient.updateToken(accessToken);
    }
  }, [eventClient, accessToken]);

  return { eventClient, events, isConnected };
}

// Component usage
function Dashboard() {
  const accessToken = localStorage.getItem("accessToken");
  const { eventClient, events, isConnected } = useAuthEvents(accessToken);

  return (
    <div>
      <div className={`status ${isConnected ? "connected" : "disconnected"}`}>
        Events: {isConnected ? "Connected" : "Disconnected"}
      </div>

      <div className="events-feed">
        {events.map((event, index) => (
          <div key={index} className="event">
            <strong>{event.type}</strong>: {JSON.stringify(event.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Vue.js Integration

```javascript
// Vue.js composable for auth events
import { ref, onMounted, onUnmounted } from "vue";

export function useAuthEvents(accessToken) {
  const eventClient = ref(null);
  const events = ref([]);
  const isConnected = ref(false);

  const initializeEventClient = () => {
    if (!accessToken.value) return;

    const client = new AuthEventClient(accessToken.value);

    client.on("connected", () => {
      isConnected.value = true;
    });

    client.on("disconnected", () => {
      isConnected.value = false;
    });

    // Handle authentication events
    client.on("authentication:login", (data) => {
      events.value.push({
        type: "login",
        message: `${data.email} logged in`,
        timestamp: new Date(),
        data,
      });
    });

    client.on("security:account_locked", (data) => {
      events.value.push({
        type: "security",
        message: `Account ${data.email} locked`,
        timestamp: new Date(),
        data,
      });
    });

    client.connect();
    eventClient.value = client;
  };

  onMounted(() => {
    initializeEventClient();
  });

  onUnmounted(() => {
    if (eventClient.value) {
      eventClient.value.disconnect();
    }
  });

  return {
    eventClient,
    events,
    isConnected,
  };
}
```

## Event Filtering

Events are automatically filtered based on the authenticated user's permissions:

### User-scoped Events

- Regular users only receive events related to their own account
- Events include: their own login/logout, email changes, password changes

### Admin-scoped Events

- Admin users receive all events across the system
- Includes all user events, security events, and administrative actions

### Event Permissions

| Event Type                         | User | Admin |
| ---------------------------------- | ---- | ----- |
| Own authentication events          | ✅   | ✅    |
| Other users' authentication events | ❌   | ✅    |
| Security events (own account)      | ✅   | ✅    |
| Security events (other accounts)   | ❌   | ✅    |
| Admin actions                      | ❌   | ✅    |
| System-wide statistics             | ❌   | ✅    |

## Error Handling

### Connection Errors

```javascript
eventClient.on("error", (error) => {
  console.error("EventSource error:", error);

  // Check if it's an authentication error
  if (error.target && error.target.readyState === EventSource.CLOSED) {
    // Connection closed, might be auth issue
    checkTokenValidity();
  }
});

eventClient.on("maxReconnectAttemptsExceeded", () => {
  console.error("Failed to reconnect to event stream");
  showConnectionError();
});

async function checkTokenValidity() {
  try {
    const response = await fetch("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // Token invalid, refresh or redirect to login
      await refreshTokenOrLogin();
    }
  } catch (error) {
    redirectToLogin();
  }
}
```

### Network Issues

```javascript
// Handle network connectivity issues
window.addEventListener("online", () => {
  if (eventClient && !eventClient.isConnected) {
    console.log("Network back online, reconnecting...");
    eventClient.connect();
  }
});

window.addEventListener("offline", () => {
  console.log("Network offline");
});
```

## Performance Considerations

### Memory Management

```javascript
class EventBuffer {
  constructor(maxSize = 100) {
    this.events = [];
    this.maxSize = maxSize;
  }

  addEvent(event) {
    this.events.push(event);

    // Keep buffer size manageable
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}
```

### Event Throttling

```javascript
// Throttle high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Usage
const throttledHandler = throttle((data) => {
  updateUI(data);
}, 1000); // Throttle to once per second

eventClient.on("authentication:login", throttledHandler);
```

## Security Considerations

1. **Authentication Required**: All event streams require valid Bearer tokens
2. **User Scoping**: Events are filtered based on user permissions
3. **Token Refresh**: Handle token expiration gracefully
4. **Connection Security**: Use HTTPS in production environments
5. **Rate Limiting**: Event connections are subject to rate limiting

## Browser Compatibility

Server-Sent Events are supported in:

- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge (all versions)
- Opera 11+

For older browsers, consider using a polyfill like `eventsource-polyfill`.
