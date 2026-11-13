/**
 * Subdomain and Route Resolver for ilmçi Platform
 *
 * Production:
 *   - ilmchi.uz / www.ilmchi.uz -> Teacher Web App & SmartBoard
 *   - admin.ilmchi.uz -> Admin Management Portal
 *
 * Local Development (port 3000):
 *   - http://localhost:3000/ -> Teacher Web App
 *   - http://localhost:3000/admin -> Admin Portal
 *   - http://admin.localhost:3000 -> Admin Portal
 *   - http://localhost:3000?app=admin -> Admin Portal
 */

export function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Production subdomain (admin.ilmchi.uz or any admin.* prefix)
  if (hostname.startsWith('admin.')) {
    return true;
  }

  // 2. Development subdomain support (e.g. admin.localhost:3000)
  if (hostname === 'admin.localhost') {
    return true;
  }

  // 3. Path-based routing (/admin or /admin/...)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return true;
  }

  // 4. Query param override (?app=admin or ?mode=admin)
  const appParam = searchParams.get('app') || searchParams.get('mode');
  if (appParam === 'admin') {
    return true;
  }

  return false;
}

export function navigateToAdmin() {
  if (typeof window === 'undefined') return;
  const hostname = window.location.hostname.toLowerCase();

  // If in production, redirect to admin subdomain
  if (hostname.includes('ilmchi.uz') && !hostname.startsWith('admin.')) {
    window.location.href = `https://admin.ilmchi.uz`;
    return;
  }

  // In local development, use /admin path
  window.history.pushState({}, '', '/admin');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateToTeacher() {
  if (typeof window === 'undefined') return;
  const hostname = window.location.hostname.toLowerCase();

  // If on admin subdomain in production, redirect to main domain
  if (hostname.startsWith('admin.ilmchi.uz')) {
    window.location.href = `https://ilmchi.uz`;
    return;
  }

  // In local development, return to root
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
