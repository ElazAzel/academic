type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

export async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | { message?: string } | null;
  if (payload && typeof payload === "object") {
    if ("error" in payload && payload.error?.message) {
      return payload.error.message;
    }
    if ("message" in payload && payload.message) {
      return payload.message;
    }
  }
  return fallback;
}
