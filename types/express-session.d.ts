// Type stubs for express-session (pre-existing missing types)
declare module "express-session" {
  interface SessionData {
    adminLoggedIn?: boolean;
    proAdminLoggedIn?: boolean;
    proAdminId?: string;
    tenantDbName?: string;
    driverLoggedIn?: boolean;
    driverId?: string;
    userLoggedIn?: boolean;
    userId?: string;
    [key: string]: any;
  }

  function session(options?: any): any;
  export = session;
}

declare module "connect-pg-simple" {
  function connectPgSimple(session: any): any;
  export = connectPgSimple;
}

// Extend Express Request to include session
declare global {
  namespace Express {
    interface Request {
      session: any;
      tenantStorage?: any;
    }
  }
}

