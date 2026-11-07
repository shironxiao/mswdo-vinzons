import { ArrowLeft, ClipboardCheck, Save, Users, X } from 'lucide-react';
import './HouseholdReviewModal.css';

function formatValue(value) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value == null ? '' : String(value).trim();
}

function detailsForPerson(person, includeHouseholdVulnerabilities = false) {
  const details = [
    ['Age', person.ageValue ?? person.age],
    ['Sex', person.sex],
    ['Relationship', person.relationship],
    ['Occupation', person.occupation || person.headOccupation],
    ['Monthly income', person.monthlyIncome],
    ['Vulnerabilities', person.vulnerabilities],
    ['Worked in DOLE before', person.hasWorkedDole],
    ['DOLE employment year', person.doleEmploymentYear],
    ['Received government assistance', person.hasReceivedGovernmentAssistance],
    ['Government assistance', person.govAssistanceAvailed],
    ['Government assistance year', person.governmentAssistanceYear],
    ['Received relief assistance', person.hasReceivedReliefAssistance],
    ['Other income source', person.otherIncomeSource],
    ['Flood depth', person.floodDepthLevel],
    ['Characteristics / remarks', person.characteristicsRemarks],
  ];

  if (person.ageUnit) {
    const ageIndex = details.findIndex(([label]) => label === 'Age');
    if (ageIndex >= 0 && formatValue(details[ageIndex][1])) {
      details[ageIndex][1] = `${formatValue(details[ageIndex][1])} ${person.ageUnit}`;
    }
  }

  return details.filter(([label, value]) => (
    (includeHouseholdVulnerabilities || label !== 'Vulnerabilities') && formatValue(value)
  ));
}

function ReviewDetails({ details }) {
  return (
    <dl className="vin-household-review-details">
      {details.map(([label, value]) => (
        <div className="vin-household-review-detail" key={label}>
          <dt>{label}</dt>
          <dd>{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HouseholdReviewModal({
  form,
  mode,
  isSaving,
  onEdit,
  onConfirm,
}) {
  const members = Array.isArray(form.members) ? form.members : [];
  const headName = form.head || 'Unnamed household head';
  const householdDetails = [
    ['Age', form.age],
    ['Sex', form.sex],
    ['Occupation', form.headOccupation],
    ['Barangay', form.barangay],
    ['Purok / Sitio', form.purok],
    ['Evacuation center', form.center],
    ['Room', form.room],
    ['Vulnerabilities', form.vulnerabilities],
    ...detailsForPerson(form, true).filter(([label]) => ![
      'Age', 'Sex', 'Occupation', 'Vulnerabilities',
    ].includes(label)),
  ].filter(([, value]) => formatValue(value));

  return (
    <div className="vin-household-review-overlay" onClick={onEdit}>
      <section
        className="vin-household-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vin-household-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vin-household-review-header">
          <span className="vin-household-review-icon"><ClipboardCheck size={21} /></span>
          <div className="vin-household-review-heading">
            <h2 id="vin-household-review-title">Review household information</h2>
            <p>Please double-check these details before saving.</p>
          </div>
          <button type="button" className="vin-household-review-close" onClick={onEdit} aria-label="Back to form">
            <X size={19} />
          </button>
        </header>

        <div className="vin-household-review-body">
          <section className="vin-household-review-section">
            <h3>{headName}</h3>
            <ReviewDetails details={householdDetails} />
          </section>

          <section className="vin-household-review-section">
            <h3 className="vin-household-review-members-title">
              <Users size={17} />
              Household members ({members.length})
            </h3>
            {members.length ? (
              <div className="vin-household-review-members">
                {members.map((member, index) => (
                  <article className="vin-household-review-member" key={member.id || index}>
                    <h4>{member.name || `Member ${index + 1}`}</h4>
                    <ReviewDetails details={detailsForPerson(member)} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="vin-household-review-empty">No additional household members.</p>
            )}
          </section>
        </div>

        <footer className="vin-household-review-actions">
          <button type="button" className="vin-household-review-back" onClick={onEdit} disabled={isSaving}>
            <ArrowLeft size={17} />
            Back to form
          </button>
          <button type="button" className="vin-household-review-confirm" onClick={onConfirm} disabled={isSaving}>
            <Save size={17} />
            {isSaving
              ? 'Saving household...'
              : mode === 'register' ? 'Confirm & Register' : 'Confirm & Save Changes'}
          </button>
        </footer>
      </section>
    </div>
  );
}
