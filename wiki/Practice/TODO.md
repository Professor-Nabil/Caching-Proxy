# 🗺️ The Caching Proxy Learning Roadmap

- [x] **Phase 1: Project Setup & CLI Argument Parsing**
  - Initialize the TypeScript project.
  - Use `commander` or a minimalist parser to accept `--port`, `--origin`, and `--clear-cache`.

- [x] **Phase 2: Basic HTTP Proxy Server**
  - Create a standard HTTP/Express server running on the user-specified port.
  - Capture any incoming request path (e.g., `/users`, `/products?limit=5`).
  - Forward that request to the origin server using `fetch` or `axios` and return the data.

- [x] **Phase 3: Adding the Caching Mechanism**
  - Create an in-memory cache data structure.
  - Check the cache on incoming requests.
  - Add the `X-Cache: HIT` and `X-Cache: MISS` headers.

- [x] **Phase 4: Clearing the Cache** Refinement & Testing\*\*
  - Implement the `--clear-cache` CLI flag to erase stored data.
  - Handle edge cases (e.g., origin server is down, invalid URLs).
  - Build and run.
