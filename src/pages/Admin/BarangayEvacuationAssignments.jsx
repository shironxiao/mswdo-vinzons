import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { supabase } from '../../lib/supabase.js';
import {
  deleteBarangayEvacuationAssignment,
  fetchBarangayEvacuationAssignments,
  saveBarangayEvacuationAssignment,
} from '../../lib/barangayEvacuationAssignments.js';
import './BarangayEvacuationAssignments.css';

const EMPTY_FORM = {
  id: null,
  barangay: '',
  purok: '',
  allPuroks: false,
  centerId: '',
  backupCenterId: '',
};

function centerLabel(center) {
  return center?.displayName || center?.name || 'Unknown center';
}

export default function BarangayEvacuationAssignments() {
  const { centers } = useEvacuationCenters();
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setAssignments(await fetchBarangayEvacuationAssignments());
    } catch (error) {
      console.error('Could not load barangay evacuation assignments:', error);
      setLoadError(error.message || 'Could not load assignments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let refreshTimeout;
    const initialLoad = window.setTimeout(loadAssignments, 0);

    const channel = supabase
      .channel('barangay-evacuation-assignments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'barangay_evacuation_assignments' },
        () => {
          window.clearTimeout(refreshTimeout);
          refreshTimeout = window.setTimeout(loadAssignments, 200);
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      window.clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [loadAssignments]);

  const centersById = useMemo(
    () => new Map(centers.map((center) => [center.id, center])),
    [centers]
  );
  const barangayOptions = useMemo(
    () => [...new Set(assignments.map((item) => item.barangay).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [assignments]
  );
  const purokOptions = useMemo(
    () => [...new Set(assignments
      .filter((item) => item.barangay.trim().toLowerCase() === form.barangay.trim().toLowerCase())
      .map((item) => item.purok)
      .filter((purok) => purok && purok.toLowerCase() !== 'all'))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [assignments, form.barangay]
  );
  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((item) => {
      if (!query) return true;
      const primary = centerLabel(centersById.get(item.center_id));
      const backup = centerLabel(centersById.get(item.backup_center_id));
      return [item.barangay, item.purok, primary, backup]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [assignments, centersById, search]);

  const editAssignment = (assignment) => {
    setForm({
      id: assignment.id,
      barangay: assignment.barangay,
      purok: assignment.purok === 'ALL' ? '' : assignment.purok,
      allPuroks: assignment.purok.trim().toLowerCase() === 'all',
      centerId: assignment.center_id,
      backupCenterId: assignment.backup_center_id || '',
    });
    setFormError('');
    setNotice('');
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError('');
    setNotice('');
    setIsSaving(true);
    try {
      await saveBarangayEvacuationAssignment({
        id: form.id,
        barangay: form.barangay,
        purok: form.allPuroks ? 'ALL' : form.purok,
        centerId: form.centerId,
        backupCenterId: form.backupCenterId,
      });
      resetForm();
      setNotice('Evacuation center assignment saved.');
      await loadAssignments();
    } catch (error) {
      console.error('Could not save barangay evacuation assignment:', error);
      setFormError(error.message || 'Could not save this assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (assignment) => {
    const label = `${assignment.barangay} / ${assignment.purok === 'ALL' ? 'All Puroks' : assignment.purok}`;
    if (!window.confirm(`Remove the evacuation-center assignment for ${label}?`)) return;

    setDeletingId(assignment.id);
    setFormError('');
    setNotice('');
    try {
      await deleteBarangayEvacuationAssignment(assignment.id);
      if (form.id === assignment.id) resetForm();
      setNotice('Evacuation center assignment removed.');
      await loadAssignments();
    } catch (error) {
      console.error('Could not delete barangay evacuation assignment:', error);
      setLoadError(error.message || 'Could not remove this assignment.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="vin-bga-page">
      <header className="vin-bga-header">
        <div>
          <span className="vin-bga-eyebrow">EVACUATION CENTER MANAGEMENT</span>
          <h1 className="vin-bga-title">Barangay &amp; Purok Assignments</h1>
          <p className="vin-bga-description">
            Set a primary and optional backup evacuation center for each barangay and purok.
            A specific purok assignment can coexist with an All Puroks assignment.
          </p>
        </div>
      </header>

      <div className="vin-bga-layout">
        <form className="vin-bga-card vin-bga-form" onSubmit={handleSave}>
          <div className="vin-bga-card-heading">
            <span className="vin-bga-icon"><MapPin size={19} /></span>
            <div>
              <h2>{form.id ? 'Edit assignment' : 'Add assignment'}</h2>
              <p>One assignment per barangay and purok.</p>
            </div>
          </div>

          <label className="vin-bga-field">
            <span>Barangay</span>
            <input
              list="vin-bga-barangays"
              value={form.barangay}
              onChange={(event) => setForm((current) => ({ ...current, barangay: event.target.value }))}
              placeholder="Choose or enter a barangay"
              maxLength={100}
              required
            />
            <datalist id="vin-bga-barangays">
              {barangayOptions.map((barangay) => <option key={barangay} value={barangay} />)}
            </datalist>
          </label>

          <label className="vin-bga-field">
            <span>Purok / sitio</span>
            <input
              list="vin-bga-puroks"
              value={form.allPuroks ? '' : form.purok}
              onChange={(event) => setForm((current) => ({ ...current, purok: event.target.value }))}
              placeholder={form.allPuroks ? 'Applies to every purok' : 'Choose or enter a purok'}
              maxLength={100}
              disabled={form.allPuroks}
              required={!form.allPuroks}
            />
            <datalist id="vin-bga-puroks">
              {purokOptions.map((purok) => <option key={purok} value={purok} />)}
            </datalist>
          </label>

          <label className="vin-bga-all-puroks">
            <input
              type="checkbox"
              checked={form.allPuroks}
              onChange={(event) => setForm((current) => ({
                ...current,
                allPuroks: event.target.checked,
                purok: event.target.checked ? '' : current.purok,
              }))}
            />
            <span>Apply to All Puroks in this barangay</span>
          </label>

          <label className="vin-bga-field">
            <span>Primary evacuation center</span>
            <select
              value={form.centerId}
              onChange={(event) => setForm((current) => ({ ...current, centerId: event.target.value }))}
              required
            >
              <option value="">Select a primary center</option>
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {centerLabel(center)} — {center.location}
                </option>
              ))}
            </select>
          </label>

          <label className="vin-bga-field">
            <span>Backup evacuation center <small>(optional)</small></span>
            <select
              value={form.backupCenterId}
              onChange={(event) => setForm((current) => ({ ...current, backupCenterId: event.target.value }))}
            >
              <option value="">No backup center</option>
              {centers
                .filter((center) => center.id !== form.centerId)
                .map((center) => (
                  <option key={center.id} value={center.id}>
                    {centerLabel(center)} — {center.location}
                  </option>
                ))}
            </select>
          </label>

          {formError && <p className="vin-bga-message error" role="alert">{formError}</p>}
          {notice && <p className="vin-bga-message success" role="status">{notice}</p>}

          <div className="vin-bga-form-actions">
            {form.id && (
              <button type="button" className="vin-bga-secondary-btn" onClick={resetForm}>
                <X size={16} /> Cancel edit
              </button>
            )}
            <button type="submit" className="vin-bga-primary-btn" disabled={isSaving || centers.length === 0}>
              {form.id ? <Pencil size={16} /> : <Plus size={17} />}
              {isSaving ? 'Saving…' : form.id ? 'Save changes' : 'Save assignment'}
            </button>
          </div>
          {centers.length === 0 && (
            <p className="vin-bga-helper">Add an evacuation center before creating an assignment.</p>
          )}
        </form>

        <section className="vin-bga-card vin-bga-list-card">
          <div className="vin-bga-list-heading">
            <div>
              <h2>Saved assignments</h2>
              <p>{assignments.length} barangay/purok mapping{assignments.length === 1 ? '' : 's'}</p>
            </div>
            <label className="vin-bga-search">
              <span className="sr-only">Search assignments</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assignments"
              />
            </label>
          </div>

          {loadError && (
            <div className="vin-bga-message error" role="alert">
              {loadError}
              <button type="button" onClick={loadAssignments}><RotateCcw size={14} /> Retry</button>
            </div>
          )}

          {isLoading ? (
            <p className="vin-bga-empty">Loading assignments…</p>
          ) : filteredAssignments.length === 0 ? (
            <p className="vin-bga-empty">
              {search ? 'No assignments match your search.' : 'No barangay assignments yet.'}
            </p>
          ) : (
            <div className="vin-bga-table-wrap">
              <table className="vin-bga-table">
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th>Purok</th>
                    <th>Primary center</th>
                    <th>Backup center</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td data-label="Barangay">{assignment.barangay}</td>
                      <td data-label="Purok">
                        {assignment.purok.trim().toLowerCase() === 'all' ? 'All Puroks' : assignment.purok}
                      </td>
                      <td data-label="Primary center">
                        <span className="vin-bga-center-name">
                          <Building2 size={15} />
                          {centerLabel(centersById.get(assignment.center_id))}
                        </span>
                      </td>
                      <td data-label="Backup center">
                        {assignment.backup_center_id
                          ? centerLabel(centersById.get(assignment.backup_center_id))
                          : <span className="vin-bga-no-backup">Not set</span>}
                      </td>
                      <td data-label="Actions" className="vin-bga-row-actions">
                        <button type="button" onClick={() => editAssignment(assignment)} aria-label={`Edit ${assignment.barangay} ${assignment.purok} assignment`}>
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(assignment)}
                          disabled={deletingId === assignment.id}
                          aria-label={`Delete ${assignment.barangay} ${assignment.purok} assignment`}
                        >
                          <Trash2 size={15} /> {deletingId === assignment.id ? 'Removing…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
