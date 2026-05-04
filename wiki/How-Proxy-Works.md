# 🧠 Understanding the Core Concept

To understand what you are building,
let's contrast how a normal client-server request works versus how a caching proxy server operates.

In a traditional setup,
the client makes a direct request to the origin server,
and the origin server responds.

With a caching proxy,
your CLI tool sits directly between the client and the origin server.

## 1. The First Request (Cache MISS)

1. The **Client** requests `http://localhost:3000/products`.
2. The **Proxy** checks its memory/cache. It sees nothing stored for `/products`.
3. The **Proxy** makes a real request to `http://dummyjson.com/products`.
4. The **Origin Server** returns the data to the Proxy.
5. The **Proxy** saves the response in its cache and sends the data back to the Client with the header `X-Cache: MISS`.

## 2. The Second Request (Cache HIT)

1. The **Client** requests `http://localhost:3000/products` again.
2. The **Proxy** checks its memory/cache. It finds the saved response!
3. The **Proxy** skips making any request to the origin server.
4. The **Proxy** returns the saved data to the Client immediately with the header `X-Cache: HIT`.

---
