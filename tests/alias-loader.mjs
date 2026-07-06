import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const srcRootPath = fileURLToPath(new URL("../src/", import.meta.url));

export async function resolve(specifier, context, defaultResolve) {
  if (
    specifier === "@/lib/db" ||
    specifier === "@/lib/auth" ||
    specifier === "@/lib/counsel-invites" ||
    specifier === "@/lib/notifications" ||
    specifier === "@/lib/analytics"
  ) {
    return {
      url: pathToFileURL(path.join(path.dirname(srcRootPath), "tests", "lib-shim.mjs")).href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    const absolutePath = path.resolve(srcRootPath, relativePath);
    const candidates = [
      absolutePath,
      `${absolutePath}.ts`,
      `${absolutePath}.tsx`,
      `${absolutePath}.js`,
      path.join(absolutePath, "index.ts"),
      path.join(absolutePath, "index.tsx"),
      path.join(absolutePath, "index.js"),
    ];

    const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (resolvedPath) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      };
    }
  }

  if (specifier.startsWith("next/") && !specifier.endsWith(".js")) {
    try {
      return await defaultResolve(`${specifier}.js`, context, defaultResolve);
    } catch {
      // Fall through to Node's default resolution for any other package shape.
    }
  }

  if (specifier === "server-only") {
    return {
      url: pathToFileURL(path.join(path.dirname(srcRootPath), "tests", "server-only-shim.mjs")).href,
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".json")) {
    const jsonText = fs.readFileSync(fileURLToPath(url), "utf8");
    return {
      format: "module",
      source: `export default ${jsonText};`,
      shortCircuit: true,
    };
  }

  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const sourceText = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
        esModuleInterop: true,
        sourceMap: false,
      },
      fileName: filePath,
    });

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
