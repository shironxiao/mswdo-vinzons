import {
  LayoutDashboard,
  Home,
  Building,
  Activity,
} from 'lucide-react';

/**
 * Mobile Bottom Navigation Items
 * Synchronized across all mobile views!
 * Relief merged into Households — only 4 tabs remain.
 */
export const MOBILE_NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/mobile/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'households',
    label: 'Households',
    path: '/mobile/households',
    icon: Home,
  },
  {
    id: 'centers',
    label: 'Centers',
    path: '/mobile/centers',
    icon: Building,
  },
  {
    id: 'monitor',
    label: 'Monitor',
    path: '/mobile/monitor',
    icon: Activity,
  },
];
