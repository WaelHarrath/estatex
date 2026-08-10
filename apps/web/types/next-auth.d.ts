import "next-auth";
import "next-auth/jwt";

interface EstatexSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

declare module "next-auth" {
  interface Session {
    user: EstatexSessionUser;
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
