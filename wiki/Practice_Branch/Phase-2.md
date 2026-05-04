# Phase 2

Excellent! Let's dive right into **Phase 2**.

In this phase,
we will set up an HTTP server that acts as a middleman.
It listens on our local port,
grabs whatever path or query the client asks for,
fetches that exact data from the origin server,
and sends it back to the client.

To keep our CLI clean and avoid heavy dependencies,
we'll use **Express** to create the server
and the built-in **`fetch`** API to forward the requests.

---

## Step 1: Install Express

Run the following command in your project root to install Express and its types:

```bash
npm install express
npm install --save-dev @types/express
```

---

## Step 2: Set up the Proxy Forwarding Logic

Let's update `src/index.ts` to spin up an Express server and forward requests.

We will use `req.url` to capture everything—including query parameters
like `/products?limit=5`—and forward it directly to the origin.

#### Update **`src/index.ts`**

```typescript
import { Command } from "commander";
import express from "express";

const program = new Command();

program
  .name("caching-proxy")
  .description("A simple CLI caching proxy server")
  .option("-p, --port <number>", "Port on which the proxy server will run")
  .option("-o, --origin <url>", "The URL of the server to forward requests to")
  .option("--clear-cache", "Clear the cached responses and exit")
  .action(async (options) => {
    if (options.clearCache) {
      console.log("🧹 Clearing the cache...");
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

    // Strip trailing slash from origin if present to prevent double slashes in forwarding
    if (origin.endsWith("/")) {
      origin = origin.slice(0, -1);
    }

    const app = express();

    // Middleware to parse incoming request bodies (for POST, PUT, etc.)
    app.use(express.json());

    // Catch-all route handler for ANY incoming path (GET, POST, etc.)
    app.use(async (req, res) => {
      // 1. Construct the target URL (origin + incoming path and query params)
      const targetUrl = `${origin}${req.url}`;
      console.log(
        `\n🔍 Forwarding request: [${req.method}] ${req.url} -> ${targetUrl}`,
      );

      try {
        // 2. Forward the request to the origin server using fetch
        const response = await fetch(targetUrl, {
          method: req.method,
          // Forward original headers, omitting host to prevent SSL/routing issues
          headers: {
            ...(req.headers as Record<string, string>),
            host: new URL(origin).host,
          },
        });

        // 3. Extract status code and data from origin response
        const data = await response.text();

        // 4. Send the origin's response back to our client
        res.status(response.status).send(data);
        console.log(`✅ Success: ${response.status} from ${targetUrl}`);
      } catch (err: any) {
        console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
        res
          .status(500)
          .json({ error: "Failed to forward request to origin server" });
      }
    });

    // Start listening on the user-specified port
    app.listen(port, () => {
      console.log(`🚀 Proxy server running at http://localhost:${port}`);
      console.log(`📡 Forwarding all traffic to ${origin}`);
    });
  });

program.parse();
```

---

## Step 3: Test Phase 2

Let's test if our middleman server correctly forwards traffic to `http://dummyjson.com`.

1. Start your caching proxy server:

   ```bash
   npm start -- --port 3000 --origin http://dummyjson.com
   ```

2. Open a separate terminal and test it using `curl` or visit it in your browser:

   ```bash
   curl http://localhost:3000/products
   ```

   Or visit: `http://localhost:3000/users`

Your console will show exactly how the request was intercepted, forwarded to the origin server, and returned to your client!

Let me know once you test it and see it successfully forwarding. Then we will move to **Phase 3: Adding the Caching Mechanism**.
