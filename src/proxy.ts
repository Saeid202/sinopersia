import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
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
  const isSellerAuthPage = path === '/seller-centre/login' || path === '/seller-centre/register';
  const isSellerArea = path.startsWith('/seller-centre');

  const isProtected = path.startsWith('/dashboard') || path.startsWith('/agent') || path.startsWith('/admin') || path.startsWith('/api/admin');
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (path.startsWith('/dashboard') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'customer') {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === 'admin' ? '/admin' : profile?.role === 'agent' ? '/agent' : profile?.role === 'seller' ? '/seller-centre' : '/login';
      return NextResponse.redirect(url);
    }
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

  if (isSellerArea && !isSellerAuthPage) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/seller-centre/login';
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const { data: seller } = await supabase.from('shop_sellers').select('id').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'seller' || !seller) {
      const url = request.nextUrl.clone();
      url.pathname = '/seller-centre/register';
      return NextResponse.redirect(url);
    }
  }

  if (isSellerAuthPage && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role === 'seller') {
      const { data: seller } = await supabase.from('shop_sellers').select('id').eq('id', user.id).maybeSingle();
      // Only bounce to /seller-centre once registration (shop_sellers row) exists;
      // otherwise this would redirect-loop against the !seller check above.
      if (seller) {
        const url = request.nextUrl.clone();
        url.pathname = '/seller-centre';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/agent/:path*', '/admin/:path*', '/api/admin/:path*', '/seller-centre/:path*'],
};