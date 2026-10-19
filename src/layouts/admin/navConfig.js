import {
  LayoutDashboard,
  Building2,
  Home,
  Building,
  ClipboardCheck,
  Package,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';

/**
 * Default sidebar navigation items matching the MSWDO-Vinzons Admin specification.
 */
export const DEFAULT_ADMIN_NAV_SECTIONS = [
  {
    id: 'navigation',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'evacuation-center',
        label: 'Evacuation Center',
        path: '/admin/evacuation-center',
        icon: Building2,
      },
      {
        id: 'household',
        label: 'Household',
        path: '/admin/household',
        icon: Home,
      },
      {
        id: 'room-placement',
        label: 'Room Placement',
        path: '/admin/room-placement',
        icon: Building,
      },
      {
        id: 'evacuee-monitoring',
        label: 'Evacuee Monitoring',
        path: '/admin/evacuee-monitoring',
        icon: ClipboardCheck,
      },
      {
        id: 'relief-goods-stubs',
        label: 'Relief Goods Stubs',
        path: '/admin/relief-goods-stubs',
        icon: Package,
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/admin/reports',
        icon: BarChart3,
      },
      {
        id: 'user-management',
        label: 'User Management',
        path: '/admin/user-management',
        icon: Users,
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: Settings,
      },
    ],
  },
];
