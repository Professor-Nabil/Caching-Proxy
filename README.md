# 🚀 Caching Proxy CLI

A lightweight Command Line Interface (CLI) tool

---

## 📦 Installation & Setup

Follow these steps to set up the project locally:

1. **Clone the repository or navigate to the project directory:**

   ```bash
   cd caching-proxy
   ```

2. **Install the dependencies:**

   ```bash
   npm install
   ```

---

## 🚀 Usage Guide

### 1. Start the Caching Proxy

To start forwarding traffic to an origin server, pass the port and origin URL using the CLI flags:

```bash
npx tsx src/index.ts --port <number> --origin <url>
```

#### Example

```bash
npx tsx src/index.ts --port 3000 --origin http://dummyjson.com
```

This starts the proxy server at `http://localhost:3000` and forwards all requests to `http://dummyjson.com`.

---

### 2. Test with `curl`

Once your server is running, open a separate terminal and test the caching behavior:

```bash
# First request (Cache MISS)
curl -v http://localhost:3000/products

# Second request (Cache HIT)
curl -v http://localhost:3000/products
```

Observe the `X-Cache` response headers in your terminal.
You will see it switch from `MISS` to `HIT` instantly!

---

### 3. Clear the Cache

To erase all cached responses across both your in-memory storage and disk, run the clear command:

```bash
npx tsx src/index.ts --clear-cache
```

#### Output

```text
🧹 Cache cleared successfully.
```

---

## 📁 Project Structure

- **`src/index.ts`** — The entry point of the CLI tool. Handles argument parsing, proxying logic, and disk/memory synchronization.
- **`.cache.json`** — An internal file used to persist cached data across process restarts.
- **`package.json`** — Project metadata, dependencies (`express`, `commander`, `node-cache`), and scripts.
- **`tsconfig.json`** — TypeScript configuration file.

---

## 🧠 How It Works

When you send a request to the caching proxy,
the tool evaluates its internal storage before deciding whether to contact the original server.

### 1. Cache MISS (First Request)

If the proxy has never seen the request before:

1. The **Proxy** receives the request (e.g., `GET /products`).
2. It looks up the request key in `node-cache` and doesn't find it (**MISS**).
3. It forwards the request to the real origin server (e.g., `http://dummyjson.com/products`).
4. It saves the response in memory and returns it to you with the header `X-Cache: MISS`.

### 2. Cache HIT (Subsequent Requests)

If the exact same request is sent again:

1. The **Proxy** receives the request.
2. It finds the matching key in memory (**HIT**).
3. It bypasses the origin server entirely.
4. It returns the stored data directly from RAM with the header `X-Cache: HIT`.

---

[Roadmap.sh](https://roadmap.sh/projects/caching-server)
