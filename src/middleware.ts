import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isProtected = path.startsWith('/dashboard') || path.startsWith('/agent') || path.startsWith('/admin') || path.startsWith('/api/admin');
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if ((path.startsWith('/agent') || path.startsWith('/admin') || path.startsWith('/api/admin')) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const requiredRole = path.startsWith('/admin') || path.startsWith('/api/admin') ? 'admin' : 'agent';
    if (profile?.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === 'admin' ? '/admin' : profile?.role === 'agent' ? '/agent' : '/dashboard';
      if (path.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 403 });
      }
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/agent/:path*', '/admin/:path*', '/api/admin/:path*'],
};
