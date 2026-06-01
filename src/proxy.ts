import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextMiddleware } from "next/server";

const clerkProxy = clerkMiddleware();

const proxy: NextMiddleware = (request, event) => {
  if (process.env.FARO_ENABLE_TEST_AUTH === "1" && process.env.NODE_ENV !== "production") {
    return;
  }
  return clerkProxy(request, event);
};

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
