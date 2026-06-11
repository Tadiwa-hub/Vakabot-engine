export type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  EVOLUTION_API_URL: string;
  EVOLUTION_API_KEY: string;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
  CLERK_SECRET_KEY: string;
  PAYNOW_INTEGRATION_ID: string;
  PAYNOW_INTEGRATION_KEY: string;
  MESSAGE_QUEUE: Queue<any>;
  MANAGER: DurableObjectNamespace;
};
