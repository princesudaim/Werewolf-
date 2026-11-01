import path from "path";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  server: { allowedHosts: [".e2b.app"] },
  plugins: [react(), tailwindcss(), viteSingleFile(), {
    name: "serve-game-download-in-development",
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        if ((req.url?.split("?")[0] ?? "") !== "/Werewolf-Game.zip") return next();
        const file = path.resolve(__dirname,"dist/Werewolf-Game.zip");
        if (!existsSync(file)) { res.statusCode=503; res.end("The download is not built yet. Run npm run build first."); return; }
        res.setHeader("Content-Type","application/zip");
        res.setHeader("Content-Disposition",'attachment; filename="Werewolf-Game.zip"');
        createReadStream(file).pipe(res);
      });
    },
  }, {
    name: "version-offline-shell",
    apply: "build",
    closeBundle() {
      // Include every published asset so image/manifest-only edits refresh the cache too.
      const output = path.resolve(__dirname, "dist");
      const hash = createHash("sha256");
      const hashDirectory = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) hashDirectory(file);
          else if (file !== path.join(output, "sw.js")) {
            hash.update(path.relative(output, file));
            hash.update(readFileSync(file));
          }
        }
      };
      hashDirectory(output);
      const revision = hash.digest("hex").slice(0, 12);
      const worker = path.resolve(__dirname, "dist/sw.js");
      writeFileSync(worker, readFileSync(worker, "utf8").replace("__BUILD_REVISION__", revision));
    },
  }],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
