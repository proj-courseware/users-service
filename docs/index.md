# API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints available in the Backend Template project. The API follows RESTful conventions and uses JSON for request/response payloads.

## Base URL

```
http://localhost:3000
```

## Authentication

All API endpoints (except health check and root) require authentication using Bearer tokens.

### Authentication Header

```http
Authorization: Bearer <your-token>
```

### User Roles

The API supports two global roles:

- `admin`: Full access to all resources
- `user`: Limited access based on ownership and permissions

## Global Response Format

### Success Responses

All successful responses return JSON with appropriate HTTP status codes:

- `200 OK`: Successful GET, PUT requests
- `201 Created`: Successful POST requests
- `204 No Content`: Successful DELETE requests

### Error Responses

Error responses follow a consistent format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:

- `400 Bad Request`: Invalid request data or validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side errors

## Core Endpoints

### Health Check

Check the health status of the API.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:**

```json
{
  "status": "ok"
}
```

### Root Endpoint

Basic API information endpoint.

**Endpoint:** `GET /`

**Authentication:** Not required

**Response:**

```
Hello Hono!
```

## Notes API

The Notes API provides full CRUD operations for managing note resources.

### Data Models

#### Note Object

```typescript
{
  id: string;           // Unique identifier
  content: string;      // Note content (required)
  createdBy: string;    // User ID of the creator
  createdAt?: Date;     // Creation timestamp (optional, set by system)
  updatedAt?: Date;     // Last update timestamp (optional, set by system)
}
```

#### Create Note Request

```typescript
{
  content: string; // Note content (required, minimum 1 character)
}
```

#### Update Note Request

```typescript
{
  content?: string;     // Note content (optional for updates)
}
```

### Query Parameters

The following query parameters are supported for listing endpoints:

- `search` (string, optional): Search term for filtering results
- `sortBy` (string, optional): Field to sort by
- `sortOrder` (enum, optional): Sort direction (`asc` or `desc`)
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of items per page (default: 10)
- `createdBy` (string, optional): Filter by creator user ID

### Endpoints

#### Get All Notes

Retrieve a paginated list of notes with optional filtering and sorting.

**Endpoint:** `GET /notes`

**Authentication:** Required

**Query Parameters:**

- `search` (optional): Search in note content
- `sortBy` (optional): Sort field
- `sortOrder` (optional): `asc` or `desc`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `createdBy` (optional): Filter by creator user ID

**Example Request:**

```http
GET /notes?search=meeting&sortBy=createdAt&sortOrder=desc&page=1&limit=5
Authorization: Bearer your-token-here
```

**Response:**

```json
{
  "data": [
    {
      "id": "note-123",
      "content": "Meeting notes from today",
      "createdBy": "user-456",
      "createdAt": "2025-06-15T20:30:00.000Z",
      "updatedAt": "2025-06-15T20:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 5,
  "totalPages": 5
}
```

#### Get Note by ID

Retrieve a specific note by its ID.

**Endpoint:** `GET /notes/:id`

**Authentication:** Required

**Path Parameters:**

- `id` (string, required): Note ID

**Example Request:**

```http
GET /notes/note-123
Authorization: Bearer your-token-here
```

**Response:**

```json
{
  "id": "note-123",
  "content": "Meeting notes from today",
  "createdBy": "user-456",
  "createdAt": "2025-06-15T20:30:00.000Z",
  "updatedAt": "2025-06-15T20:30:00.000Z"
}
```

**Error Response (404):**

```json
{
  "error": "Not Found"
}
```

#### Create Note

Create a new note.

**Endpoint:** `POST /notes`

**Authentication:** Required

**Request Body:**

```json
{
  "content": "This is my new note content"
}
```

**Example Request:**

```http
POST /notes
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "content": "This is my new note content"
}
```

**Response (201 Created):**

```json
{
  "id": "note-789",
  "content": "This is my new note content",
  "createdBy": "user-456",
  "createdAt": "2025-06-15T20:35:00.000Z",
  "updatedAt": "2025-06-15T20:35:00.000Z"
}
```

**Validation Error (400):**

```json
{
  "error": "Validation failed",
  "details": "Note content is required for creation."
}
```

#### Update Note

Update an existing note.

**Endpoint:** `PUT /notes/:id`

**Authentication:** Required

**Path Parameters:**

- `id` (string, required): Note ID

**Request Body:**

```json
{
  "content": "Updated note content"
}
```

**Example Request:**

```http
PUT /notes/note-123
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "content": "Updated note content"
}
```

**Response (200 OK):**

```json
{
  "id": "note-123",
  "content": "Updated note content",
  "createdBy": "user-456",
  "createdAt": "2025-06-15T20:30:00.000Z",
  "updatedAt": "2025-06-15T20:40:00.000Z"
}
```

**Error Response (404):**

```json
{
  "error": "Not Found"
}
```

#### Delete Note

Delete a note by ID.

**Endpoint:** `DELETE /notes/:id`

**Authentication:** Required

**Path Parameters:**

- `id` (string, required): Note ID

**Example Request:**

```http
DELETE /notes/note-123
Authorization: Bearer your-token-here
```

**Response (200 OK):**

```json
{
  "message": "Note deleted successfully"
}
```

**Error Response (404):**

```json
{
  "error": "Not Found"
}
```

## Real-time Events API

The API provides Server-Sent Events (SSE) for real-time updates on resource changes.

### Server-Sent Events Endpoint

Subscribe to real-time events for notes and other resources.

**Endpoint:** `GET /events`

**Authentication:** Required

**Response Type:** `text/event-stream`

**Example Request:**

```http
GET /events
Authorization: Bearer your-token-here
Accept: text/event-stream
```

**Response Headers:**

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Event Types

#### Connection Event

Sent immediately upon successful connection.

```
data: {"type":"connected"}
```

#### Note Events

Real-time notifications for note operations.

**Note Created Event:**

```
event: notes:created
data: {
  "id": "event-uuid",
  "action": "created",
  "data": {
    "id": "note-123",
    "content": "New note content",
    "createdBy": "user-456",
    "createdAt": "2025-06-15T20:30:00.000Z",
    "updatedAt": "2025-06-15T20:30:00.000Z"
  },
  "user": {
    "id": "user-456",
    "userId": "user-456",
    "globalRole": "user"
  },
  "timestamp": "2025-06-15T20:30:00.000Z",
  "resourceType": "notes"
}
```

**Note Updated Event:**

```
event: notes:updated
data: {
  "id": "event-uuid",
  "action": "updated",
  "data": {
    "id": "note-123",
    "content": "Updated note content",
    "createdBy": "user-456",
    "createdAt": "2025-06-15T20:30:00.000Z",
    "updatedAt": "2025-06-15T20:35:00.000Z"
  },
  "user": {
    "id": "user-456",
    "userId": "user-456",
    "globalRole": "user"
  },
  "timestamp": "2025-06-15T20:35:00.000Z",
  "resourceType": "notes"
}
```

**Note Deleted Event:**

```
event: notes:deleted
data: {
  "id": "event-uuid",
  "action": "deleted",
  "data": {
    "id": "note-123",
    "content": "Deleted note content",
    "createdBy": "user-456",
    "createdAt": "2025-06-15T20:30:00.000Z",
    "updatedAt": "2025-06-15T20:35:00.000Z"
  },
  "user": {
    "id": "user-456",
    "userId": "user-456",
    "globalRole": "user"
  },
  "timestamp": "2025-06-15T20:40:00.000Z",
  "resourceType": "notes"
}
```

#### Heartbeat

Periodic heartbeat to keep connection alive (sent every 30 seconds).

```
: heartbeat
```

### Event Authorization

Events are filtered based on user permissions:

- Users receive events for notes they created
- Admin users receive events for all notes
- Events include authorization context for proper filtering

### Client-Side Usage

#### JavaScript EventSource

```javascript
const eventSource = new EventSource("/events", {
  headers: {
    Authorization: "Bearer your-token-here",
  },
});

// Listen for connection
eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "connected") {
    console.log("Connected to event stream");
  }
});

// Listen for note events
eventSource.addEventListener("notes:created", (event) => {
  const eventData = JSON.parse(event.data);
  console.log("Note created:", eventData.data);
});

eventSource.addEventListener("notes:updated", (event) => {
  const eventData = JSON.parse(event.data);
  console.log("Note updated:", eventData.data);
});

eventSource.addEventListener("notes:deleted", (event) => {
  const eventData = JSON.parse(event.data);
  console.log("Note deleted:", eventData.data);
});

// Handle errors
eventSource.onerror = (error) => {
  console.error("EventSource error:", error);
};
```

## Authorization

### Permission Model

The API implements role-based authorization:

#### Global Roles

- **Admin**: Full access to all resources and operations
- **User**: Limited access based on resource ownership

#### Resource-Level Permissions

**Notes:**

- **Create**: All authenticated users can create notes
- **Read**: Users can read their own notes; admins can read all notes
- **Update**: Users can update their own notes; admins can update all notes
- **Delete**: Users can delete their own notes; admins can delete all notes

**Events:**

- Users receive events for notes they have permission to access
- Event filtering follows the same rules as CRUD operations

## Rate Limiting

Currently, no rate limiting is implemented. This is a consideration for production deployments.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production environments.

## Development Notes

### Mock Authentication Service

For development purposes, a mock authentication service is available at `http://localhost:3333`. This service provides test tokens for development and testing.

### Database

The API supports both mock (in-memory) and MongoDB database implementations:

- **Development**: Uses MongoDB by default
- **Testing**: Uses mock in-memory database
- **Production**: Uses MongoDB

### Environment Variables

Key environment variables for API configuration:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development, test, production)
- `AUTH_SERVICE_URL`: External authentication service URL
- `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`: MongoDB configuration

## Error Handling

The API implements comprehensive error handling:

### Validation Errors

- Request body validation using Zod schemas
- Query parameter validation
- Path parameter validation

### Authentication Errors

- Missing or invalid Bearer tokens
- Expired tokens
- Malformed authentication headers

### Authorization Errors

- Insufficient permissions for requested operations
- Resource access violations

### Business Logic Errors

- Resource not found errors
- Constraint violations
- Data integrity issues

### System Errors

- Database connection errors
- External service failures
- Unexpected server errors

All errors are logged appropriately and return consistent error response formats to clients.
