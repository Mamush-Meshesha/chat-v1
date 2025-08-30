// Environment configuration
export const environment = {
  // Check if we're in development or production
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // URLs based on environment
  SOCKET_URL:
    import.meta.env.VITE_SOCKET_URL || "https://chat-v1-socket.onrender.com",
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "https://mam-98fa.onrender.com",

  // Fallback to production URLs if environment variables are not set
  getSocketUrl: () => {
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    return "https://chat-v1-socket.onrender.com";
  },

  getApiBaseUrl: () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    return "https://mam-98fa.onrender.com";
  },
};

// Log environment info
console.log("🌍 Environment:", {
  isDevelopment: environment.isDevelopment,
  isProduction: environment.isProduction,
  socketUrl: environment.getSocketUrl(),
  apiBaseUrl: environment.getApiBaseUrl(),
});
