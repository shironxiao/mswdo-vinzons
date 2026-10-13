import {
  LayoutDashboard,
  Home,
  Building,
  Ticket,
  Activity,
} from 'lucide-react';

/**
 * Mobile Bottom Navigation Items
 * Synchronized across all mobile views!
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
    id: 'relief',
    label: 'Relief',
    path: '/mobile/relief',
    icon: Ticket,
  },
  {
    id: 'monitor',
    label: 'Monitor',
    path: '/mobile/monitor',
    icon: Activity,
  },
];
