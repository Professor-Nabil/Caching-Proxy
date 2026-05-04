# Here are the most popular and useful modules for Node.js

---

## 1. `lru-cache` (The Best for Memory Management)

**LRU** stands for **Least Recently Used**.
It is an in-memory cache that has a maximum size.
Once the cache reaches its limit,
it automatically deletes the oldest,
least accessed items to make room for new ones.

- **Why use it:** It guarantees your application will never crash from running out of RAM (Out of Memory).
- **Key Features:** Supports Time-to-Live (TTL), limits by item count, and limits by byte size.

### Quick Example

```typescript
import { LRUCache } from "lru-cache";

const options = {
  max: 500, // Maximum 500 items in the cache
  ttl: 1000 * 60 * 5, // Items expire after 5 minutes
};

const cache = new LRUCache(options);

// Set and get
cache.set("GET:/products", { data: "..." });
const cachedData = cache.get("GET:/products");
```

---

## 2. `cache-manager` (The Best for Multi-Storage & Flexibility)

`cache-manager` is a highly versatile caching module.
It provides a unified API, meaning you write the code once,
and you can switch the storage engine underneath whenever you want.

- **Why use it:**
  You want to start by caching data in RAM locally,
  but plan to switch to **Redis**, **SQLite**, or **MongoDB** later as your app scales.

- **Key Feature:**
  The `wrap` function. It checks if a key exists in the cache.
  If it doesn't, it runs your function, caches the result, and returns it—all in one step!

### Quick Example

```typescript
import { createCache } from "cache-manager";

const cache = createCache({
  ttl: 10000, // 10 seconds
});

// Wrapping a fetch call automatically
const products = await cache.wrap("products_list", async () => {
  const res = await fetch("https://dummyjson.com/products");
  return res.json();
});
```

---

## 3. `node-cache` (The Best for Simple In-Memory Caching)

If you just want a standard key-value store with Time-to-Live (TTL)
expiration in memory and zero extra setup, `node-cache` is the most straightforward package.

- **Why use it:** Extremely simple to learn and use.
- **Key Feature:** Emits events when keys expire or are deleted.

### Quick Example

```typescript
import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

// Set key with value and specific TTL
myCache.set("myKey", { foo: "bar" }, 60);

// Retrieve key
const value = myCache.get("myKey");
```

---

## 🛠️ Which one should you pick?

- Use **`lru-cache`**
  if your primary concern is managing your server's RAM usage efficiently.

- Use **`cache-manager`**
  if you are building a real-world API that might eventually use **Redis**
  or a database to share cache across multiple instances of your server.

- Use **`node-cache`**
  for small internal scripts or basic CLI utilities
  where you just need straightforward in-memory storage.
