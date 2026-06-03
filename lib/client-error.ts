export function getSafeClientErrorMetadata(error: unknown) {
  const errorType = error instanceof Error ? error.name : typeof error;
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
      errorType,
      code: typeof record.code === "string" ? record.code : undefined,
      statusCode: typeof record.statusCode === "number" || typeof record.statusCode === "string"
        ? record.statusCode
        : typeof record.status === "number" || typeof record.status === "string"
          ? record.status
          : undefined,
    };
  }
  return { errorType };
}
