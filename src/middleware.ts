import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all paths except Next.js internals, static files, and API routes
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
