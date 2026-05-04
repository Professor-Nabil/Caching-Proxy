# Phase 1

## 🚦 Step 1: Initialize the Project & Setup CLI Argument Parsing

Let's start **Phase 1**. We need to create a new folder, set up TypeScript, and parse the command line arguments correctly.

Run the following commands in your terminal to set up a brand new project folder:

```bash
mkdir caching-proxy
cd caching-proxy
npm init -y
npm install commander
npm install --save-dev typescript @types/node tsx
npx tsc --init
```

Once you've done that, let's create our initial script just to test parsing the user input.

## Create your source file: `src/index.ts`

```typescript
import { Command } from "commander";

const program = new Command();

program
  .name("caching-proxy")
  .description("A simple CLI caching proxy server")
  .option("-p, --port <number>", "Port on which the proxy server will run")
  .option("-o, --origin <url>", "The URL of the server to forward requests to")
  .option("--clear-cache", "Clear the cached responses and exit")
  .action((options) => {
    // 1. Handle clearing the cache first
    if (options.clearCache) {
      console.log("🧹 Clearing the cache...");
      // For now, we just print this message. We will implement this logic later!
      process.exit(0);
    }

    // 2. Validate mandatory arguments for running the server
    const port = parseInt(options.port, 10);
    const origin = options.origin;

    if (!port || !origin) {
      console.error(
        "❌ Error: You must specify both --port and --origin to start the proxy.",
      );
      process.exit(1);
    }

    console.log(
      `🚀 Starting proxy on port ${port}, forwarding requests to: ${origin}`,
    );
  });

program.parse();
```

To easily test this without constantly compiling, add a script to your **`package.json`**:

```json
"scripts": {
  "start": "tsx src/index.ts"
}
```

#### Try it out in the terminal

```bash
# 1. Test missing parameters error
npm start -- --port 3000

# 2. Test valid parameters
npm start -- --port 3000 --origin http://dummyjson.com

# 3. Test clear cache flag
npm start -- --clear-cache
```

Once you run these tests and confirm that the terminal
is correctly capturing your inputs without crashing,
we are ready to move to **Phase 2**!
Let me know when you're ready to proceed.
