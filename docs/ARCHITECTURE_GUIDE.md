# Architecture Golden Standard (GStack Integration)

This project follows a strict **Modular Monolith** architecture with clear layer boundaries.

## Layer 1: Server Modules (Business Logic / Services)
- **Path**: `server/modules/`
- **Responsibility**: Pure business logic, database access via Prisma, domain rules, orchestration of other modules.
- **Rule**: This is the **ONLY** layer allowed to use the Prisma Client directly.

## Layer 2: Server Actions (Gateways / Controllers)
- **Path**: `server/actions/`
- **Responsibility**: Interface between UI and Modules. Handles Zod validation, session retrieval, RBAC checks, and calls Server Modules.
- **Rule**: Must throw `ApiError` for predictable error handling in the UI.

## Layer 3: API Route Handlers (External REST)
- **Path**: `app/api/v1/`
- **Responsibility**: Public or internal REST endpoints. Thin wrappers around Server Modules.
- **Rule**: Shared logic must be in Modules, not in the route handler itself.

## Layer 4: UI Components (Presentation)
- **Path**: `components/` and `app/`
- **Responsibility**: Rendering, user interaction, client-side state.
- **Rule**: **STRICTLY FORBIDDEN** to use Prisma here. Must consume data via Server Actions or API routes.

## Error Handling Standard
- Always use `new ApiError(code, message, status)`.
- User-facing messages MUST be in Russian.

## Validation Standard
- All inputs from the client MUST be validated via Zod schemas in Server Actions or Route Handlers.
