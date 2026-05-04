# Phase 4: Clearing the Cache

Currently, the in-memory cache resets when we kill the proxy server (`Ctrl+C`).
However, the requirements state that the user should be able to run a specific command to clear the cache:

```bash
caching-proxy --clear-cache
```

Since this is a CLI tool,
running the command with the `--clear-cache` flag starts a _separate_ Node process.
This process has no direct access to the RAM of our running proxy server.

To clear the cache permanently across processes,
we must switch from a purely in-memory cache to a **file-based cache**
or use a simple file to coordinate the clearing.
Let's convert our cache to use a local JSON file (`.cache.json`).

---

### Step 1: Update to File-Based Caching

We will use the built-in Node `fs` (File System) module
to save and read our cache from a file named `.cache.json` in the root of the project.

#### Update **`src/index.ts`**

```typescript
import { Command } from "commander";
import express from "express";
import fs from "fs";
import path from "path";

const program = new Command();
const CACHE_FILE = path.join(process.cwd(), ".cache.json");

// Helper function to read the cache file
const readCacheFile = (): Record<string, any> => {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
};

// Helper function to write to the cache file
const writeCacheFile = (cache: Record<string, any>) => {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
};

program
  .name("caching-proxy")
  .description("A simple CLI caching proxy server")
  .option("-p, --port <number>", "Port on which the proxy server will run")
  .option("-o, --origin <url>", "The URL of the server to forward requests to")
  .option("--clear-cache", "Clear the cached responses and exit")
  .action(async (options) => {
    // Phase 4: Clear the cache file completely and exit
    if (options.clearCache) {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
      console.log("🧹 Cache cleared successfully.");
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
      const cacheKey = `${req.method}:${req.url}`;
      const targetUrl = `${origin}${req.url}`;

      // 1. Read existing cache
      const cache = readCacheFile();

      // 2. Check for cache HIT
      if (cache[cacheKey]) {
        console.log(`\n🎯 Cache HIT for: ${cacheKey}`);
        const cachedResponse = cache[cacheKey];

        res.setHeader("X-Cache", "HIT");
        res.status(cachedResponse.status).send(cachedResponse.data);
        return;
      }

      // 3. Cache MISS - Forward to origin
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

        // 4. Save response to cache if it's a valid GET request
        if (req.method === "GET" && response.status === 200) {
          cache[cacheKey] = {
            status: response.status,
            data,
          };
          writeCacheFile(cache);
          console.log(`📥 Cached response to .cache.json for: ${cacheKey}`);
        }

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

### Step 2: Final Test Run

Let's test our complete, fully functional caching server!

1. **Start the proxy:**

   ```bash
   npm start -- --port 3000 --origin http://dummyjson.com
   ```

2. **Make the first request (Cache MISS):**

   ```bash
   curl -v http://localhost:3000/products
   ```

   - Result: Returns `X-Cache: MISS`. A `.cache.json` file is created in your project folder.

3. **Make the second request (Cache HIT):**

   ```bash
   curl -v http://localhost:3000/products
   ```

   - Result: Returns immediately with `X-Cache: HIT`.

4. **Clear the cache from another terminal:**

   ```bash
   npm start -- --clear-cache
   ```

   - Result: Prints `🧹 Cache cleared successfully.` and removes the `.cache.json` file.

5. **Test again after clearing:**

   ```bash
   curl -v http://localhost:3000/products
   ```

   - Result: Back to `X-Cache: MISS`!

You did it! You have built a complete, working caching proxy server from scratch.
