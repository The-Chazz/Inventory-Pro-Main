import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrPathOrOptions: string | { url: string; method?: string; data?: unknown }
): Promise<Response> {
  let url: string;
  let method = "GET";
  let data: unknown | undefined = undefined;

  if (typeof urlOrPathOrOptions === "string") {
    url = urlOrPathOrOptions;
  } else {
    url = urlOrPathOrOptions.url;
    method = urlOrPathOrOptions.method || "GET";
    data = urlOrPathOrOptions.data;
  }

  // Get current user info from session storage to include in headers
  let headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add user-info header if user is logged in
  const userData = sessionStorage.getItem("user");
  if (userData) {
    headers["user-info"] = userData;
  }
  
  const res = await fetch(url, {
    method,
    headers: headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add user-info header if user is logged in
    let headers: Record<string, string> = {};
    const userData = sessionStorage.getItem("user");
    if (userData) {
      headers["user-info"] = userData;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
