// environmental-configuration — JSON configuration admitted from the process
// environment, not from package manifests.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  parse as parseJson,
  type JsonValue,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json";

export type JsonConfiguration = JsonValue;

export type EnvironmentalConfigurationSource =
  | {
      readonly kind: "stdin";
      readonly label: "stdin";
    }
  | {
      readonly kind: "explicit-file";
      readonly path: string;
    }
  | {
      readonly kind: "cwd-file";
      readonly path: string;
    }
  | {
      readonly kind: "cwd-config-file";
      readonly path: string;
    }
  | {
      readonly kind: "home-config-file";
      readonly path: string;
    };
type EnvironmentalConfigurationFileSource = Exclude<EnvironmentalConfigurationSource, { readonly kind: "stdin" }>;

export interface EnvironmentalConfiguration<T = unknown> {
  readonly kind: "computing.environmental-configuration";
  readonly name: string;
  readonly source: EnvironmentalConfigurationSource;
  readonly document: T;
}

export interface EnvironmentalConfigurationPathsOptions {
  readonly name: string;
  readonly cwd?: string;
  readonly home?: string;
}

export interface LoadEnvironmentalConfigurationOptions<T = unknown> extends EnvironmentalConfigurationPathsOptions {
  readonly explicitPath?: string;
  /** Already-read stdin text. Empty or whitespace-only stdin is ignored. */
  readonly stdinText?: string;
  readonly parse?: (document: unknown) => T;
}

export function environmentalConfigurationPaths(
  options: EnvironmentalConfigurationPathsOptions,
): readonly EnvironmentalConfigurationFileSource[] {
  const name = requiredConfigName(options.name);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const home = options.home ?? homedir();
  const sources: EnvironmentalConfigurationFileSource[] = [
    Object.freeze({ kind: "cwd-file" as const, path: path.join(cwd, `${name}.config.json`) }),
    Object.freeze({ kind: "cwd-config-file" as const, path: path.join(cwd, ".config", `${name}.config.json`) }),
  ];
  if (home.trim() !== "") {
    sources.push(Object.freeze({ kind: "home-config-file" as const, path: path.join(home, ".config", `${name}.config.json`) }));
  }
  return Object.freeze(sources);
}

export function parseJsonConfiguration(text: string, label = "configuration JSON"): JsonConfiguration {
  try {
    return parseJson(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`${label}: ${message}`);
  }
}

export function loadEnvironmentalConfiguration<T = unknown>(
  options: LoadEnvironmentalConfigurationOptions<T>,
): EnvironmentalConfiguration<T> {
  const name = requiredConfigName(options.name);
  const parse = options.parse ?? ((document: unknown) => document as T);
  const stdinText = options.stdinText?.trim();
  if (stdinText) {
    return freezeConfig(name, { kind: "stdin", label: "stdin" }, parse(parseJsonConfiguration(stdinText, "stdin")));
  }

  if (options.explicitPath !== undefined) {
    const source = Object.freeze({
      kind: "explicit-file" as const,
      path: path.resolve(options.cwd ?? process.cwd(), options.explicitPath),
    });
    return freezeConfig(name, source, parse(readJsonFile(source.path)));
  }

  for (const source of environmentalConfigurationPaths(options)) {
    if (!existsSync(source.path)) continue;
    return freezeConfig(name, source, parse(readJsonFile(source.path)));
  }

  throw new Error(configurationNotFoundMessage(name, options));
}

export function configurationNotFoundMessage(nameInput: string, options: EnvironmentalConfigurationPathsOptions): string {
  const name = requiredConfigName(nameInput);
  const files = environmentalConfigurationPaths(options)
    .map((source) => source.path)
    .join(", ");
  return `${name} configuration not found; provide JSON on stdin or create one of: ${files}`;
}

function readJsonFile(filePath: string): unknown {
  return parseJsonConfiguration(readFileSync(filePath, "utf8"), filePath);
}

function freezeConfig<T>(
  name: string,
  source: EnvironmentalConfigurationSource,
  document: T,
): EnvironmentalConfiguration<T> {
  return Object.freeze({
    kind: "computing.environmental-configuration" as const,
    name,
    source,
    document,
  });
}

function requiredConfigName(value: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("environmental configuration name must be a non-empty string");
  }
  if (value.includes("/") || value.includes("\\") || value === "." || value === "..") {
    throw new TypeError("environmental configuration name must be a file stem, not a path");
  }
  return value;
}
