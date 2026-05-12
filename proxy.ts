import { withAuth } from "next-auth/middleware";

const middleware = withAuth({
  pages: {
    signIn: "/login"
  }
});

export default middleware;

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/curator/:path*",
    "/instructor/:path*",
    "/super-curator/:path*",
    "/customer-observer/:path*"
  ]
};
