#!/usr/bin/env node

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
