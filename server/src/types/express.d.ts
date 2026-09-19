export interface AuthContext {
  userId: string;
  username: string;
  groups: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
