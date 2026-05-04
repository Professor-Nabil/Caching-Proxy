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

    app.use(async (req, res) => {
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
