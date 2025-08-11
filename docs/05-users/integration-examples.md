# Integration Examples

This document provides comprehensive code examples for integrating with the Authentication Service across different programming languages and frameworks.

## Complete User Registration Flow

### JavaScript/Node.js

```javascript
// Complete user registration with email verification
async function registerUser(userData) {
  try {
    // 1. Register user
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();

    // 2. Store tokens securely
    localStorage.setItem("accessToken", result.tokens.accessToken);
    localStorage.setItem("refreshToken", result.tokens.refreshToken);

    // 3. Redirect to email verification notice
    window.location.href = "/verify-email";

    return result;
  } catch (error) {
    console.error("Registration failed:", error.message);
    throw error;
  }
}
```

### Python

```python
import requests

def register_user(user_data):
    """Register a new user and handle the response"""
    try:
        response = requests.post(
            'https://your-api-domain.com/auth/register',
            headers={'Content-Type': 'application/json'},
            json={
                'firstName': user_data['firstName'],
                'lastName': user_data['lastName'],
                'email': user_data['email'],
                'password': user_data['password']
            }
        )

        if response.status_code == 201:
            result = response.json()
            # Store tokens securely in your application
            store_tokens(result['tokens'])
            return result
        else:
            error = response.json()
            raise Exception(f"Registration failed: {error['error']}")

    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        raise

def store_tokens(tokens):
    """Store tokens securely (implement based on your storage solution)"""
    # Example: Store in session, database, or secure storage
    session['access_token'] = tokens['accessToken']
    session['refresh_token'] = tokens['refreshToken']
```

## Authentication with Token Refresh

### Advanced JavaScript Client

```javascript
// Complete API client with automatic token refresh
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  async request(endpoint, options = {}) {
    try {
      return await this.makeRequest(endpoint, options);
    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.status === 401 && this.refreshToken) {
        await this.refreshTokens();
        return await this.makeRequest(endpoint, options);
      }
      throw error;
    }
  }

  async makeRequest(endpoint, options) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, ...error };
    }

    return await response.json();
  }

  async refreshTokens() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, redirect to login
      this.logout();
      throw new Error("Session expired");
    }

    const tokens = await response.json();
    this.accessToken = tokens.tokens.accessToken;
    this.refreshToken = tokens.tokens.refreshToken;

    localStorage.setItem("accessToken", this.accessToken);
    localStorage.setItem("refreshToken", this.refreshToken);
  }

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  }
}

// Usage
const api = new ApiClient("https://your-api-domain.com");

// Get user profile with automatic token refresh
const user = await api.request("/me");
console.log("User profile:", user);
```

### Python with Token Refresh

```python
import requests
import time
from datetime import datetime, timedelta

class AuthenticatedClient:
    def __init__(self, base_url, access_token=None, refresh_token=None):
        self.base_url = base_url
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at = None

    def request(self, method, endpoint, **kwargs):
        """Make authenticated request with automatic token refresh"""
        try:
            return self._make_request(method, endpoint, **kwargs)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401 and self.refresh_token:
                self._refresh_tokens()
                return self._make_request(method, endpoint, **kwargs)
            raise

    def _make_request(self, method, endpoint, **kwargs):
        headers = kwargs.get('headers', {})
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'

        kwargs['headers'] = headers

        response = requests.request(
            method,
            f'{self.base_url}{endpoint}',
            **kwargs
        )

        response.raise_for_status()
        return response.json()

    def _refresh_tokens(self):
        """Refresh access token using refresh token"""
        response = requests.post(
            f'{self.base_url}/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )

        if response.status_code == 200:
            tokens = response.json()['tokens']
            self.access_token = tokens['accessToken']
            self.refresh_token = tokens['refreshToken']
            # Store tokens securely
            store_tokens(tokens)
        else:
            raise Exception('Token refresh failed')

# Usage
client = AuthenticatedClient('https://your-api-domain.com')
user_profile = client.request('GET', '/me')
```

## Social Login Integration

### Frontend OAuth Implementation

```javascript
// Social login integration
class OAuthManager {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async getProviders() {
    const response = await fetch(`${this.baseURL}/auth/oauth/providers`);
    return await response.json();
  }

  initiateOAuth(provider) {
    // Save current location for post-login redirect
    localStorage.setItem("redirectAfterLogin", window.location.pathname);

    // Redirect to OAuth provider
    window.location.href = `${this.baseURL}/auth/oauth/${provider}`;
  }

  handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");

    if (error) {
      console.error("OAuth login failed:", error);
      this.showError(error);
      return;
    }

    if (token) {
      // OAuth successful, token is provided
      localStorage.setItem("accessToken", token);

      // Get user info and redirect
      this.fetchUserInfo(token).then(() => {
        const redirectPath =
          localStorage.getItem("redirectAfterLogin") || "/dashboard";
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirectPath;
      });
    }
  }

  async fetchUserInfo(token) {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = await response.json();
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }

  showError(message) {
    // Show error to user (implement based on your UI framework)
    alert(`Login failed: ${message}`);
  }
}

// Usage
const oauth = new OAuthManager("https://your-api-domain.com");

// Initialize OAuth buttons
document.getElementById("google-login").onclick = () =>
  oauth.initiateOAuth("google");
document.getElementById("github-login").onclick = () =>
  oauth.initiateOAuth("github");
document.getElementById("linkedin-login").onclick = () =>
  oauth.initiateOAuth("linkedin");

// Handle OAuth callback (in your callback page)
if (window.location.pathname === "/oauth/callback") {
  oauth.handleCallback();
}
```

### Backend OAuth Validation

```python
def validate_oauth_token(token):
    """Validate OAuth token and get user info"""
    try:
        response = requests.get(
            'https://your-api-domain.com/auth/me',
            headers={'Authorization': f'Bearer {token}'}
        )

        if response.status_code == 200:
            return response.json()
        else:
            return None
    except requests.exceptions.RequestException:
        return None

# Flask example
from flask import session, redirect, request

@app.route('/oauth/callback')
def oauth_callback():
    token = request.args.get('token')
    error = request.args.get('error')

    if error:
        flash(f'Login failed: {error}')
        return redirect('/login')

    if token:
        user = validate_oauth_token(token)
        if user:
            session['access_token'] = token
            session['user_id'] = user['id']
            return redirect('/dashboard')

    flash('Authentication failed')
    return redirect('/login')
```

## Framework-Specific Integrations

### React Integration

```jsx
// React hook for authentication
import { useState, useEffect, useContext, createContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const response = await fetch("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const { user, tokens } = await response.json();
      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      setUser(user);
      return user;
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Component usage
const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect or update UI
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

### Vue.js Integration

```javascript
// Vue.js authentication store (Pinia)
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
  },

  actions: {
    async login(email, password) {
      this.loading = true;

      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const data = await response.json();
          this.setTokens(data.tokens);
          this.user = data.user;
          return data;
        } else {
          const error = await response.json();
          throw new Error(error.error);
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchUser() {
      if (!this.accessToken) return;

      try {
        const response = await fetch('/auth/me', {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });

        if (response.ok) {
          this.user = await response.json();
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        this.logout();
      }
    },

    setTokens(tokens) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
  },
});

// Component usage
<template>
  <div v-if="authStore.loading">Loading...</div>
  <div v-else-if="authStore.isAuthenticated">
    Welcome, {{ authStore.user.firstName }}!
    <button @click="authStore.logout">Logout</button>
  </div>
  <div v-else>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit" :disabled="authStore.loading">Login</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const email = ref('');
const password = ref('');

onMounted(() => {
  authStore.fetchUser();
});

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value);
  } catch (error) {
    alert(error.message);
  }
};
</script>
```

## Mobile Integration Examples

### React Native

```javascript
// React Native authentication with secure storage
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";

class MobileAuthService {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async storeTokens(tokens) {
    // Store tokens securely
    await Keychain.setInternetCredentials(
      "auth_tokens",
      "access_token",
      tokens.accessToken,
    );

    await AsyncStorage.setItem("refresh_token", tokens.refreshToken);
  }

  async getTokens() {
    try {
      const credentials = await Keychain.getInternetCredentials("auth_tokens");
      const refreshToken = await AsyncStorage.getItem("refresh_token");

      if (credentials && refreshToken) {
        return {
          accessToken: credentials.password,
          refreshToken: refreshToken,
        };
      }
    } catch (error) {
      console.error("Failed to get tokens:", error);
    }
    return null;
  }

  async clearTokens() {
    await Keychain.resetInternetCredentials("auth_tokens");
    await AsyncStorage.removeItem("refresh_token");
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      await this.storeTokens(data.tokens);
      return data;
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  }
}

// Usage in React Native component
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const authService = new MobileAuthService("https://your-api-domain.com");

  const handleLogin = async () => {
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      Alert.alert("Success", "Logged in successfully");
      // Navigate to main app
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: "blue", padding: 15 }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Integration Testing Examples

```javascript
// Integration test examples
describe("Authentication Service Integration", () => {
  const API_BASE = "http://localhost:3000";
  let userToken = "";

  it("should register a new user", async () => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "TestPass123!",
      }),
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.user.email).toBe("test@example.com");
    expect(result.tokens.accessToken).toBeDefined();

    userToken = result.tokens.accessToken;
  });

  it("should login with credentials", async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPass123!",
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.tokens.accessToken).toBeDefined();
  });

  it("should access protected endpoint", async () => {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.email).toBe("test@example.com");
  });

  it("should refresh tokens", async () => {
    // First get refresh token
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPass123!",
      }),
    });

    const { tokens } = await loginResponse.json();

    // Use refresh token
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    expect(refreshResponse.status).toBe(200);
    const refreshResult = await refreshResponse.json();
    expect(refreshResult.tokens.accessToken).toBeDefined();
    expect(refreshResult.tokens.refreshToken).toBeDefined();
  });
});
```

## Rate Limiting Handling

```javascript
// Handle rate limit responses
class RateLimitAwareClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.requestQueue = [];
    this.processing = false;
  }

  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const { endpoint, options, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await this.makeRequest(endpoint, options);
        resolve(response);
      } catch (error) {
        if (error.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = this.getRetryDelay(error.headers);
          await this.wait(retryAfter);

          // Put request back in queue
          this.requestQueue.unshift({ endpoint, options, resolve, reject });
          continue;
        }
        reject(error);
      }
    }

    this.processing = false;
  }

  async makeRequest(endpoint, options) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw {
        status: response.status,
        headers: response.headers,
        ...error,
      };
    }

    return await response.json();
  }

  getRetryDelay(headers) {
    const resetTime = headers.get("X-RateLimit-Reset");
    if (resetTime) {
      return Math.max(0, resetTime * 1000 - Date.now());
    }
    return 60000; // Default 1 minute
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

These examples provide comprehensive integration patterns for various scenarios and frameworks. Choose the examples that best match your application's architecture and requirements.
