import Dexie from 'dexie';

export const db = new Dexie('VinzonsOfflineDB');

// Database schema definition
db.version(1).stores({
  households: 'id, householdCode, headName, barangay, purok, centerId, roomId, evacueeStatus, stubIssued, updatedAt',
  household_details: 'id, updatedAt',
  centers: 'id, name, displayName',
  rooms: 'id, centerId, name',
  monitoring_logs: 'id, householdId, centerId, roomId, createdAt',
  barangay_assignments: 'id, centerId, barangay, purok',
  pending_mutations: '++id, type, table, clientTimestamp, status',
  sync_metadata: 'key',
});

/**
 * Determine whether device is currently online
 */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Queue a mutation when offline or when cloud write fails
 */
export async function queuePendingMutation(type, table, payload) {
  const mutation = {
    type, // 'CREATE_HOUSEHOLD' | 'UPDATE_HOUSEHOLD' | 'ISSUE_STUB' | 'TRANSFER_ROOM' | 'LOG_MONITORING'
    table,
    payload,
    clientTimestamp: new Date().toISOString(),
    status: 'pending', // 'pending' | 'syncing' | 'failed'
    attempts: 0,
    lastError: null,
  };
  const id = await db.pending_mutations.add(mutation);
  notifySyncQueueChanged();
  return id;
}

/**
 * Get count of pending outbox mutations
 */
export async function getPendingMutationsCount() {
  try {
    return await db.pending_mutations.where('status').equals('pending').count();
  } catch {
    return 0;
  }
}

/**
 * Read all pending mutations in FIFO order
 */
export async function getPendingMutations() {
  try {
    return await db.pending_mutations
      .where('status')
      .anyOf('pending', 'failed')
      .sortBy('id');
  } catch {
    return [];
  }
}

/**
 * Remove a mutation after successful cloud sync
 */
export async function removePendingMutation(id) {
  try {
    await db.pending_mutations.delete(id);
    notifySyncQueueChanged();
  } catch (err) {
    console.warn('Could not remove pending mutation from Dexie:', err);
  }
}

/**
 * Update mutation error details if an attempt failed
 */
export async function markPendingMutationFailed(id, errorMessage) {
  try {
    const existing = await db.pending_mutations.get(id);
    if (existing) {
      await db.pending_mutations.update(id, {
        status: 'failed',
        attempts: (existing.attempts || 0) + 1,
        lastError: errorMessage,
      });
      notifySyncQueueChanged();
    }
  } catch (err) {
    console.warn('Could not mark mutation as failed:', err);
  }
}

/**
 * Store metadata key-value pair
 */
export async function setSyncMeta(key, value) {
  try {
    await db.sync_metadata.put({ key, value, updatedAt: Date.now() });
  } catch (err) {
    console.warn('Could not save sync meta:', err);
  }
}

/**
 * Retrieve metadata key-value pair
 */
export async function getSyncMeta(key) {
  try {
    const record = await db.sync_metadata.get(key);
    return record ? record.value : null;
  } catch {
    return null;
  }
}

// Broadcast channel & window event for real-time UI updates
export const SYNC_QUEUE_EVENT = 'vinzons-sync-queue-changed';
const queueChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vinzons-sync-queue') : null;

export function notifySyncQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_EVENT));
  }
  try {
    queueChannel?.postMessage({ type: 'queue-changed' });
  } catch {
    // Ignore channel message issues
  }
}
