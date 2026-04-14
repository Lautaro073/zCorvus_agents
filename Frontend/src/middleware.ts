import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { DEFAULT_LOCALE, LOCALES, type Locale, routing } from './i18n/routing';

const REFRESH_TOKEN_COOKIE_KEY = 'refreshToken';
const USER_ROLE_COOKIE_KEY = 'userRole';
const i18nMiddleware = createMiddleware(routing);

function hasLocaleSegment(segment: string | undefined): segment is Locale {
  if (!segment) {
    return false;
  }

  return LOCALES.includes(segment as Locale);
}

function resolveLocaleFromPath(pathname: string): Locale {
  const [, firstSegment] = pathname.split('/');

  if (hasLocaleSegment(firstSegment)) {
    return firstSegment;
  }

  return DEFAULT_LOCALE;
}

function isAdminPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  const [firstSegment, secondSegment] = segments;

  if (hasLocaleSegment(firstSegment)) {
    return secondSegment === 'admin';
  }

  return firstSegment === 'admin';
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;
    const userRole = request.cookies.get(USER_ROLE_COOKIE_KEY)?.value;

    if (!refreshToken) {
      const locale = resolveLocaleFromPath(pathname);
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole === 'user' || userRole === 'pro') {
      const locale = resolveLocaleFromPath(pathname);
      const iconsUrl = new URL(`/${locale}/icons`, request.url);
      return NextResponse.redirect(iconsUrl);
    }
  }

  return i18nMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
