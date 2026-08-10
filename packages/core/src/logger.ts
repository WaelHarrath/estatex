import { pino } from "pino";

type Level = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

const LEVELS: readonly Level[] = ["fatal", "error", "warn", "info", "debug", "trace"];

function resolveLevel(): Level {
  const fromEnv = process.env.LOG_LEVEL as Level | undefined;
  if (fromEnv && LEVELS.includes(fromEnv)) {
    return fromEnv;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export const logger = pino({
  level: resolveLevel(),
  base: { service: "estatex" },
  timestamp: pino.stdTimeFunctions.isoTime
});
