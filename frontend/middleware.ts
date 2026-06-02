export { default } from 'next-auth/middleware';
export const config = { matcher: ['/dashboard/:path*', '/tenders/:path*', '/upload/:path*', '/proposals/:path*', '/chatbot/:path*', '/compare/:path*', '/settings/:path*', '/admin/:path*'] };
