import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, MapPin, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { supabase } from '../../lib/supabase.js';
import {
  deleteBarangayEvacuationAssignment,
  fetchBarangayEvacuationAssignments,
  saveBarangayEvacuationAssignment,
} from '../../lib/barangayEvacuationAssignments.js';
import { fetchHouseholdBarangays, fetchHouseholdPuroks } from '../../lib/householdService.js';
import './BarangayEvacuationAssignments.css';

const EMPTY_FORM = {
  id: null,
  barangay: '',
  purok: '',
  allPuroks: false,
  centerIds: [],
};

function centerLabel(center) {
  return center?.displayName || center?.name || 'Unknown center';
}

function assignmentCenterIds(assignment) {
  return assignment.center_ids?.length
    ? assignment.center_ids
    : [assignment.center_id].filter(Boolean);
}

export default function BarangayEvacuationAssignments() {
  const { centers } = useEvacuationCenters();
  const [assignments, setAssignments] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [purokOptions, setPurokOptions] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [showCentersPanel, setShowCentersPanel] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const centerPickerRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    fetchHouseholdBarangays()
      .then((options) => {
        if (isCurrent) {
          setBarangayOptions(options);
          setLocationError('');
        }
      })
      .catch((error) => {
        console.error('Could not load household barangays for assignments:', error);
        if (isCurrent) setLocationError(error.message || 'Could not load barangays from household records.');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    if (!form.barangay) return undefined;

    fetchHouseholdPuroks(form.barangay)
      .then((options) => {
        if (isCurrent) {
          setPurokOptions(options);
          setLocationError('');
        }
      })
      .catch((error) => {
        console.error('Could not load household puroks for assignment:', error);
        if (isCurrent) {
          setPurokOptions([]);
          setLocationError(error.message || 'Could not load puroks from household records.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [form.barangay]);

  useEffect(() => {
    if (!showCentersPanel) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!centerPickerRef.current?.contains(event.target)) setShowCentersPanel(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowCentersPanel(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showCentersPanel]);

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
  const filteredCenters = useMemo(() => {
    const query = centerSearch.trim().toLowerCase();
    return centers.filter((center) => (
      !query || `${centerLabel(center)} ${center.location || ''}`.toLowerCase().includes(query)
    ));
  }, [centers, centerSearch]);
  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((item) => {
      if (!query) return true;
      const assignedCenters = assignmentCenterIds(item)
        .map((centerId) => centerLabel(centersById.get(centerId)));
      return [item.barangay, item.purok, ...assignedCenters]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [assignments, centersById, search]);

  const editAssignment = (assignment) => {
    setShowCentersPanel(false);
    setCenterSearch('');
    setForm({
      id: assignment.id,
      barangay: assignment.barangay,
      purok: assignment.purok === 'ALL' ? '' : assignment.purok,
      allPuroks: assignment.purok.trim().toLowerCase() === 'all',
      centerIds: assignmentCenterIds(assignment),
    });
    setFormError('');
    setNotice('');
  };

  const resetForm = () => {
    setShowCentersPanel(false);
    setCenterSearch('');
    setForm(EMPTY_FORM);
    setPurokOptions([]);
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
        centerIds: form.centerIds,
      });
      resetForm();
      setNotice('Evacuation center assignment saved.');
      setShowCentersPanel(false);
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
            Choose a barangay and its purok from household records, then assign one or more evacuation centers.
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
              <p>Assign one or more centers to a barangay and purok.</p>
            </div>
          </div>

          <label className="vin-bga-field">
            <span>Barangay</span>
            <select
              value={form.barangay}
              onChange={(event) => {
                setPurokOptions([]);
                setLocationError('');
                setForm((current) => ({
                  ...current,
                  barangay: event.target.value,
                  purok: '',
                  allPuroks: false,
                }));
              }}
              required
            >
              <option value="">Select a barangay</option>
              {barangayOptions.map((barangay) => (
                <option key={barangay} value={barangay}>{barangay}</option>
              ))}
            </select>
          </label>

          <label className="vin-bga-field">
            <span>Purok / sitio</span>
            <select
              value={form.allPuroks ? '' : form.purok}
              onChange={(event) => setForm((current) => ({ ...current, purok: event.target.value }))}
              disabled={!form.barangay || form.allPuroks}
              required={!form.allPuroks}
            >
              <option value="">
                {form.barangay ? (purokOptions.length ? 'Select a purok' : 'No puroks found') : 'Select a barangay first'}
              </option>
              {purokOptions.map((purok) => (
                <option key={purok} value={purok}>{purok}</option>
              ))}
            </select>
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

          <fieldset className="vin-bga-center-field">
            <legend>Evacuation centers <small>(select one or more)</small></legend>
            <div className="vin-bga-center-picker" ref={centerPickerRef}>
              <button
                type="button"
                className="vin-bga-center-picker-trigger"
                onClick={() => setShowCentersPanel((open) => !open)}
                aria-expanded={showCentersPanel}
                aria-controls="vin-bga-center-panel"
                disabled={centers.length === 0}
              >
                <span>
                  {form.centerIds.length
                    ? `${form.centerIds.length} center${form.centerIds.length === 1 ? '' : 's'} selected`
                    : 'Choose evacuation centers'}
                </span>
                <ChevronDown size={16} />
              </button>
              {showCentersPanel && (
                <div className="vin-bga-center-panel" id="vin-bga-center-panel">
                  <label className="vin-bga-center-search">
                    <Search size={16} aria-hidden="true" />
                    <span className="sr-only">Search evacuation centers</span>
                    <input
                      type="search"
                      value={centerSearch}
                      onChange={(event) => setCenterSearch(event.target.value)}
                      placeholder="Search centers..."
                      autoFocus
                    />
                  </label>
                  <div className="vin-bga-center-options">
                    {filteredCenters.length === 0 ? (
                      <p className="vin-bga-center-empty">No centers match your search.</p>
                    ) : filteredCenters.map((center) => (
                      <label
                        key={center.id}
                        className={`vin-bga-center-option ${form.centerIds.includes(center.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.centerIds.includes(center.id)}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            centerIds: event.target.checked
                              ? [...current.centerIds, center.id]
                              : current.centerIds.filter((centerId) => centerId !== center.id),
                          }))}
                        />
                        <span>
                          <strong>{centerLabel(center)}</strong>
                          <small>{center.location}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="vin-bga-center-panel-footer">
                    <span>{form.centerIds.length} selected</span>
                    <button type="button" onClick={() => setShowCentersPanel(false)}>Done</button>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {locationError && <p className="vin-bga-message error" role="alert">{locationError}</p>}
          {formError && <p className="vin-bga-message error" role="alert">{formError}</p>}
          {notice && <p className="vin-bga-message success" role="status">{notice}</p>}

          <div className="vin-bga-form-actions">
            {form.id && (
              <button type="button" className="vin-bga-secondary-btn" onClick={resetForm}>
                <X size={16} /> Cancel edit
              </button>
            )}
            <button
              type="submit"
              className="vin-bga-primary-btn"
              disabled={isSaving || centers.length === 0 || !form.barangay || (!form.allPuroks && !form.purok) || form.centerIds.length === 0}
            >
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
                    <th>Evacuation centers</th>
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
                      <td data-label="Evacuation centers">
                        <div className="vin-bga-assigned-centers">
                          {assignmentCenterIds(assignment).map((centerId) => (
                            <span key={centerId} className="vin-bga-center-name">
                              <Building2 size={15} />
                              {centerLabel(centersById.get(centerId))}
                            </span>
                          ))}
                        </div>
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
