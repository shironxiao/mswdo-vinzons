import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useEvacuationCenters } from '../lib/evacuationCenters.js';

const MobileCenterContext = createContext(null);

export const ASSIGNED_CENTER_KEY = 'vinzons_mobile_assigned_center';
export const ASSIGNED_CENTER_ID_KEY = 'vinzons_mobile_assigned_center_id';

export function MobileCenterProvider({ children }) {
  const { centers, refresh: refreshCenters } = useEvacuationCenters();

  const [assignedCenter, setAssignedCenterState] = useState(() => {
    try {
      return localStorage.getItem(ASSIGNED_CENTER_KEY) || '';
    } catch {
      return '';
    }
  });

  const [assignedCenterId, setAssignedCenterIdState] = useState(() => {
    try {
      return localStorage.getItem(ASSIGNED_CENTER_ID_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isCenterPickerOpen, setIsCenterPickerOpen] = useState(false);

  // Match the assigned center object from the loaded centers list
  const assignedCenterObj = useMemo(() => {
    if (!assignedCenter || assignedCenter === 'All Centers') return null;
    return (
      centers.find(
        (c) =>
          (assignedCenterId && c.id === assignedCenterId) ||
          c.displayName === assignedCenter ||
          c.name === assignedCenter
      ) || null
    );
  }, [centers, assignedCenter, assignedCenterId]);

  // Keep ID in sync if we only had the name or vice versa
  useEffect(() => {
    if (assignedCenterObj && assignedCenterObj.id !== assignedCenterId) {
      setAssignedCenterIdState(assignedCenterObj.id);
      try {
        localStorage.setItem(ASSIGNED_CENTER_ID_KEY, assignedCenterObj.id);
      } catch (e) {
        console.warn('Storage write error:', e);
      }
    }
  }, [assignedCenterObj, assignedCenterId]);

  const setAssignedCenter = useCallback(
    (centerNameOrAll, centerId = null) => {
      const val = centerNameOrAll || 'All Centers';
      setAssignedCenterState(val);
      try {
        localStorage.setItem(ASSIGNED_CENTER_KEY, val);
      } catch (e) {
        console.warn('Storage write error:', e);
      }

      let cid = centerId;
      if (!cid && val !== 'All Centers') {
        const match = centers.find(
          (c) => c.displayName === val || c.name === val
        );
        cid = match?.id || '';
      }

      setAssignedCenterIdState(cid || '');
      try {
        if (cid) {
          localStorage.setItem(ASSIGNED_CENTER_ID_KEY, cid);
        } else {
          localStorage.removeItem(ASSIGNED_CENTER_ID_KEY);
        }
      } catch (e) {
        console.warn('Storage write error:', e);
      }
    },
    [centers]
  );

  const openCenterPicker = useCallback(() => setIsCenterPickerOpen(true), []);
  const closeCenterPicker = useCallback(() => setIsCenterPickerOpen(false), []);

  const hasSelectedCenter = Boolean(assignedCenter);

  return (
    <MobileCenterContext.Provider
      value={{
        centers,
        refreshCenters,
        assignedCenter,
        assignedCenterId,
        assignedCenterObj,
        hasSelectedCenter,
        setAssignedCenter,
        isCenterPickerOpen,
        openCenterPicker,
        closeCenterPicker,
      }}
    >
      {children}
    </MobileCenterContext.Provider>
  );
}

export function useMobileCenter() {
  const context = useContext(MobileCenterContext);
  if (!context) {
    throw new Error('useMobileCenter must be used within a MobileCenterProvider');
  }
  return context;
}
