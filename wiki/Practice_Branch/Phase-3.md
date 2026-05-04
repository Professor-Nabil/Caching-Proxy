# Phase 3

We are cruising right along! Now let's tackle **Phase 3: Adding the Caching Mechanism**.

In this phase,
we'll create a storage structure in memory using a simple JavaScript Object or `Map`.
We will use the incoming HTTP method and path as our unique cache key.

---

## 🧠 Understanding Phase 3 Architecture

Before we jump into the code,
let's visualize how our in-memory cache acts as a fast-lookup layer right
before moving to the origin server.

When a request comes in:

1. We construct a unique key using the HTTP method and request URL: e.g., `GET:/products`.

2. We check our cache.
   If that key exists,
   we immediately return the cached data with an `X-Cache: HIT` header.

3. If it doesn't exist,
   we fetch from the origin server,
   save the response data and status code in our cache,
   and return the data with an `X-Cache: MISS` header.

---

## Step 1: Implement the Cache Logic

Let's update our code in `src/index.ts` to build this system.
We will define an interface for our cached items
so we can store the HTTP status, response data, and headers.

### Update **`src/index.ts`**

```typescript
import { Command } from "commander";
import express from "express";

const program = new Command();

// Interface to structure our cached data
interface CachedResponse {
  status: number;
  data: string;
  headers: Record<string, string>;
}

// In-memory storage using a JavaScript Map
const cache = new Map<string, CachedResponse>();

program
  .name("caching-proxy")
  .description("A simple CLI caching proxy server")
  .option("-p, --port <number>", "Port on which the proxy server will run")
  .option("-o, --origin <url>", "The URL of the server to forward requests to")
  .option("--clear-cache", "Clear the cached responses and exit")
  .action(async (options) => {
    if (options.clearCache) {
      console.log("🧹 Clearing the cache...");
      cache.clear(); // Empty the map
      console.log("✅ Cache cleared successfully.");
      process.exit(0);
    }

    const port = parseInt(options.port, 10);
    let origin = options.origin;

    if (!port || !origin) {
      console.error(
        "❌ Error: You must specify both --port and --origin to start the proxy.",
      );
      process.exit(1);
    }

    if (origin.endsWith("/")) {
      origin = origin.slice(0, -1);
    }

    const app = express();
    app.use(express.json());

    app.use(async (req, res) => {
      // 1. Create a unique cache key (e.g., "GET:/products")
      const cacheKey = `${req.method}:${req.url}`;
      const targetUrl = `${origin}${req.url}`;

      // 2. Check if the response is already cached
      if (cache.has(cacheKey)) {
        console.log(`\n🎯 Cache HIT for: ${cacheKey}`);
        const cachedResponse = cache.get(cacheKey)!;

        // Set caching headers and return the cached data
        res.setHeader("X-Cache", "HIT");
        res.status(cachedResponse.status).send(cachedResponse.data);
        return;
      }

      // 3. Cache MISS - Fetch data from the origin server
      console.log(
        `\n🔍 Cache MISS for: ${cacheKey}. Forwarding to ${targetUrl}`,
      );

      try {
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            ...(req.headers as Record<string, string>),
            host: new URL(origin).host,
          },
        });

        const data = await response.text();

        // 4. Save the response into our in-memory cache if the request was a GET
        if (req.method === "GET" && response.status === 200) {
          cache.set(cacheKey, {
            status: response.status,
            data,
            headers: {}, // You can optionally capture specific response headers here too
          });
          console.log(`📥 Cached fresh response for: ${cacheKey}`);
        }

        // Set our Cache header to MISS
        res.setHeader("X-Cache", "MISS");
        res.status(response.status).send(data);
      } catch (err: any) {
        console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
        res
          .status(500)
          .json({ error: "Failed to forward request to origin server" });
      }
    });

    app.listen(port, () => {
      console.log(`🚀 Proxy server running at http://localhost:${port}`);
      console.log(`📡 Forwarding all traffic to ${origin}`);
    });
  });

program.parse();
```

---

### Step 2: Test the Caching Mechanism

Now let's test if the headers update correctly
and whether the proxy stops making requests to the origin server on subsequent hits.

1. Start your proxy server:

   ```bash
   npm start -- --port 3000 --origin http://dummyjson.com
   ```

2. Make your first request using `curl` with the `-v` flag to view response headers:

   ```bash
   curl -v http://localhost:3000/products
   ```

   **Look at your output headers.** You should see:
   `X-Cache: MISS`

3. Run the exact same command again:

   ```bash
   curl -v http://localhost:3000/products
   ```

   **Look at the headers now.** It returns immediately with: `X-Cache: HIT`

And your proxy terminal output will confirm: `🎯 Cache HIT for: GET:/products`!

Let me know if it's hitting and missing exactly as planned.
Then we'll finalize Phase 4 & 5 to make this cache clearing permanent and solid.
