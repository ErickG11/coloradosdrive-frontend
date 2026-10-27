// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findClientCalls } from "../helpers/serverClientBoundary";

const root = process.cwd();
function fixture(files: Record<string, string>) {
  return findClientCalls(
    Object.fromEntries(
      Object.entries(files).map(([name, value]) => [path.join(root, name), value]),
    ),
    root,
  );
}
describe("limite entre modulos de servidor y cliente", () => {
  it("no considera directiva una cadena use client situada despues de imports", () => {
    const result = fixture({
      "client.ts": '"use client"; export const styles=()=>"button";',
      "page.ts": 'import {styles} from "./client"; "use client"; styles();',
    });
    expect(result).toHaveLength(1);
  });
  it("rechaza llamadas directas, alias y namespace, pero permite renderizar JSX", () => {
    const client =
      '"use client"; export function styles() { return "button"; } export function Button() { return <button/>; }';
    const result = fixture({
      "client.tsx": client,
      "page.tsx":
        'import {styles as css,Button} from "./client"; import * as ui from "./client"; const alias=css; css(); ui.styles(); alias(); export default function Page(){return <Button/>;}',
    });
    expect(result.map((v) => v.call)).toEqual(["css", "ui.styles", "alias"]);
  });
  it("sigue reexports y exportaciones estrella que pasan por use client", () => {
    const result = fixture({
      "styles.ts": 'export const styles=()=>"button";',
      "client.ts": '"use client"; export * from "./styles";',
      "index.ts": 'export * from "./client";',
      "page.ts": 'import {styles} from "./index"; styles();',
    });
    expect(result).toHaveLength(1);
    expect(result[0].clientModule).toBe("client.ts");
  });
  it("admite un reexport explicito del modulo neutral y llamadas desde use client", () => {
    expect(
      fixture({
        "styles.ts": 'export const styles=()=>"button";',
        "client.ts": '"use client"; export {styles} from "./styles";',
        "index.ts": 'export * from "./client"; export {styles} from "./styles";',
        "page.ts": 'import {styles} from "./index"; styles();',
        "interactive.ts": '"use client"; import {styles} from "./client"; styles();',
      }),
    ).toEqual([]);
  });
  it("ningun modulo local sin use client invoca exports de una frontera cliente", () => {
    const files: Record<string, string> = {};
    function scan(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const name = path.join(directory, entry.name);
        if (entry.isDirectory()) scan(name);
        else if (/\.[jt]sx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
          files[name] = readFileSync(name, "utf8");
      }
    }
    for (const directory of ["app", "components", "hooks", "lib", "types"])
      scan(path.join(root, directory));
    expect(findClientCalls(files, root)).toEqual([]);
  });
});
