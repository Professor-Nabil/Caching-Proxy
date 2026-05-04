# 🗺️ Our Upgraded Project Roadmap

- [x] **Phase 1: Setup & Initialization**
  - Create a new project folder and configure TypeScript.
  - Install dependencies: `express`, `commander`, `node-cache`, `tsx`.

- [ ] **Phase 2: CLI Options & Cache Clearing**
  - Parse `--port`, `--origin`, and `--clear-cache`.
  - Set up `node-cache` persistent-style clearing if `--clear-cache` is passed.

- [ ] **Phase 3: Building the Caching Middleware**
  - Spin up the Express server.
  - Check the `node-cache` store using the request method and path.
  - Serve with `X-Cache: HIT` or fetch from the origin and store with `X-Cache: MISS`.

---

### 📦 Phase 1: Setup & Initialization

Run the following commands in your terminal to create a fresh directory and install the necessary dependencies:

```bash
mkdir caching-proxy-v2
cd caching-proxy-v2
npm init -y
npm install express commander node-cache
npm install --save-dev typescript @types/node @types/express tsx
npx tsc --init
```

---

### 🚀 Phase 2 & 3: Putting It All Together with `node-cache`

Because `node-cache` is in-memory, a separate process calling `caching-proxy --clear-cache`
won't be able to wipe it directly from the active server's RAM.

To support process-to-process clearing while enjoying the speed of `node-cache`,
we can combine it with a simple file-based signal,
or simply dump the cache to a file on changes.

Let's use `node-cache` for instant in-memory storage,
and synchronize its data to a `.cache.json` file on your disk whenever a fresh response is saved.

That way, the `--clear-cache` command can run perfectly across processes by deleting that file!

#### Create your source file: `src/index.ts`

```typescript
import { Command } from "commander";
import express from "express";
import NodeCache from "node-cache";
import fs from "fs";
import path from "path";

const program = new Command();
const CACHE_FILE = path.join(process.cwd(), ".cache.json");

// Define structure for our cached data
interface CachedResponse {
  status: number;
  data: string;
}

// 1. Initialize NodeCache with a standard Time-To-Live (TTL) of 1 hour (3600 seconds)
const memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 60 });

// Helper function to sync local file data into node-cache on server startup
const loadFileCacheIntoMemory = () => {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const fileCache = JSON.parse(data);
      for (const [key, value] of Object.entries(fileCache)) {
        memoryCache.set(key, value);
      }
      console.log("💾 Synchronized disk cache into memory.");
    } catch (err) {
      console.error(
        "⚠️ Failed to read .cache.json, starting with clean memory.",
      );
    }
  }
};

// Helper function to sync node-cache data back to the file
const syncMemoryCacheToDisk = () => {
  const allKeys = memoryCache.keys();
  const fileCache: Record<string, any> = {};
  for (const key of allKeys) {
    fileCache[key] = memoryCache.get(key);
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(fileCache, null, 2), "utf-8");
};

program
  .name("caching-proxy")
  .description("An advanced CLI caching proxy server using node-cache")
  .option("-p, --port <number>", "Port on which the proxy server will run")
  .option("-o, --origin <url>", "The URL of the server to forward requests to")
  .option("--clear-cache", "Clear the cached responses and exit")
  .action(async (options) => {
    // Handle clearing the cache
    if (options.clearCache) {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
      memoryCache.flushAll(); // Clears memory
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

    // Load any existing disk data into node-cache memory
    loadFileCacheIntoMemory();

    const app = express();
    app.use(express.json());

    app.all("*", async (req, res) => {
      const cacheKey = `${req.method}:${req.url}`;
      const targetUrl = `${origin}${req.url}`;

      // 2. Check node-cache first (In-Memory HIT)
      if (memoryCache.has(cacheKey)) {
        console.log(`\n🎯 node-cache HIT for: ${cacheKey}`);
        const cachedResponse = memoryCache.get<CachedResponse>(cacheKey)!;

        res.setHeader("X-Cache", "HIT");
        res.status(cachedResponse.status).send(cachedResponse.data);
        return;
      }

      // 3. Cache MISS - Forward request to the origin
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

        // 4. Save to node-cache if it's a successful GET request
        if (req.method === "GET" && response.status === 200) {
          memoryCache.set(cacheKey, {
            status: response.status,
            data,
          });

          // Sync to the disk file for process-to-process consistency
          syncMemoryCacheToDisk();
          console.log(`📥 Cached in memory & synced to disk for: ${cacheKey}`);
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

### 🛠️ Configuration & Testing

To test the new `node-cache` setup:

1. Add this script to your `package.json`:

```json
"scripts": {
  "start": "tsx src/index.ts"
}
```

1. **Run your new server:**

```bash
npm start -- --port 3000 --origin http://dummyjson.com
```

1. Open a second terminal and test with `curl`:

```bash
curl -v http://localhost:3000/products
```

- **First request:** Returns `X-Cache: MISS` (Fetches from origin, saves to memory, and dumps to `.cache.json`).
- **Second request:** Returns immediately with `X-Cache: HIT` straight from `node-cache` RAM!

1. Clear it whenever you want:

```bash
npm start -- --clear-cache
```

Give it a run and let me know if it all checks out!
