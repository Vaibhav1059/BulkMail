import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Bell } from 'lucide-react';

const CONDITION_OPTIONS = [
  {
    value: 'not_opened',
    label: 'Not Opened',
    description: 'Did not open the email',
    icon: '📭',
    color: '#6366f1',
    bg: 'hsl(250 100% 96%)',
    border: 'hsl(250 100% 88%)'
  },
  {
    value: 'not_clicked',
    label: 'Not Clicked',
    description: 'Did not click any link',
    icon: '🖱️',
    color: '#f59e0b',
    bg: 'hsl(45 100% 96%)',
    border: 'hsl(45 100% 82%)'
  },
  {
    value: 'no_reply',
    label: 'No Reply',
    description: 'Did not reply or engage',
    icon: '💬',
    color: '#ec4899',
    bg: 'hsl(330 100% 96%)',
    border: 'hsl(330 100% 88%)'
  }
];

const MAX_STEPS = 3;

const parseDelay = (delayDays) => {
  if (!delayDays || delayDays <= 0) return { value: 1, unit: 'minutes' };
  const totalMinutes = Math.round(delayDays * 1440);
  if (totalMinutes % 1440 === 0) {
    return { value: totalMinutes / 1440, unit: 'days' };
  }
  if (totalMinutes % 60 === 0) {
    return { value: totalMinutes / 60, unit: 'hours' };
  }
  return { value: totalMinutes, unit: 'minutes' };
};

const defaultStep = (stepNum) => ({
  step: stepNum,
  delayDays: stepNum === 1 ? 3 : stepNum === 2 ? 5 : 7,
  conditions: ['not_opened'],
  condition_logic: 'AND',
  subject: '',
  body: ''
});

export function FollowupSequenceBuilder({ sequences, onChange }) {
  const [enabled, setEnabled] = useState(sequences && sequences.length > 0);
  const [steps, setSteps] = useState(
    sequences && sequences.length > 0
      ? sequences.map(s => ({
          ...s,
          conditions: Array.isArray(s.conditions) ? s.conditions : [s.conditions || 'not_opened'],
          condition_logic: s.condition_logic || 'AND'
        }))
      : [defaultStep(1)]
  );
  const [openStep, setOpenStep] = useState(0);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    onChange(next ? steps : []);
  };

  const handleAdd = () => {
    if (steps.length >= MAX_STEPS) return;
    const newSteps = [...steps, defaultStep(steps.length + 1)];
    setSteps(newSteps);
    setOpenStep(newSteps.length - 1);
    onChange(newSteps);
  };

  const handleRemove = (idx) => {
    const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
    setSteps(newSteps);
    setOpenStep(Math.max(0, openStep - 1));
    onChange(newSteps);
  };

  const handleChange = (idx, field, value) => {
    const newSteps = steps.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setSteps(newSteps);
    onChange(newSteps);
  };

  const toggleCondition = (idx, condValue) => {
    const step = steps[idx];
    const current = step.conditions || ['not_opened'];
    const isSelected = current.includes(condValue);

    let next;
    if (isSelected) {
      // Don't allow deselecting the last one
      if (current.length === 1) return;
      next = current.filter(c => c !== condValue);
    } else {
      next = [...current, condValue];
    }
    handleChange(idx, 'conditions', next);
  };

  const getConditionSummary = (step) => {
    const labels = (step.conditions || ['not_opened'])
      .map(c => CONDITION_OPTIONS.find(o => o.value === c)?.label || c);
    if (labels.length === 1) return labels[0];
    return labels.join(` ${step.condition_logic} `);
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid hsl(210 32% 90%)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Header toggle */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: enabled ? 'hsl(250 100% 98%)' : '#fafafa',
          borderBottom: enabled ? '1px solid hsl(250 100% 92%)' : '1px solid transparent',
          transition: 'all 0.25s ease', cursor: 'pointer'
        }}
        onClick={handleToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: enabled ? 'var(--indigo-600)' : 'var(--slate-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }}>
            <Bell size={15} color={enabled ? '#fff' : 'var(--slate-500)'} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
              Follow-up Email Sequence
            </div>
            <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '1px' }}>
              {enabled
                ? `${steps.length} follow-up step${steps.length > 1 ? 's' : ''} configured`
                : 'Auto-send follow-ups to recipients who don\'t engage'}
            </div>
          </div>
        </div>
        {/* Toggle switch */}
        <div style={{
          width: '40px', height: '22px', borderRadius: '11px',
          background: enabled ? 'var(--indigo-600)' : 'var(--slate-200)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
        }}>
          <div style={{
            position: 'absolute', top: '3px',
            left: enabled ? '21px' : '3px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s'
          }} />
        </div>
      </div>

      {/* Steps builder */}
      {enabled && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((step, idx) => {
            const isOpen = openStep === idx;
            const summary = getConditionSummary(step);

            return (
              <div key={idx} style={{
                border: `1.5px solid ${isOpen ? 'hsl(250 100% 88%)' : 'hsl(210 32% 90%)'}`,
                borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s',
                background: isOpen ? 'hsl(250 100% 99.5%)' : '#fff'
              }}>
                {/* Step header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', cursor: 'pointer',
                    background: isOpen ? 'hsl(250 100% 97.5%)' : 'transparent'
                  }}
                  onClick={() => setOpenStep(isOpen ? -1 : idx)}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--indigo-600)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, flexShrink: 0
                  }}>{step.step}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-800)' }}>
                      Follow-up #{step.step}
                      {step.subject && (
                        <span style={{ fontWeight: 400, color: 'var(--slate-500)', marginLeft: '6px' }}>
                          — {step.subject.slice(0, 38)}{step.subject.length > 38 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const { value: delayVal, unit: delayUnit } = parseDelay(step.delayDays);
                      return (
                        <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '2px', fontWeight: 600 }}>
                          After {delayVal} {delayUnit} · {summary}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {steps.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--rose-500)', padding: '4px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <ChevronDown size={14} style={{
                      color: 'var(--slate-400)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s'
                    }} />
                  </div>
                </div>

                {/* Step form */}
                {isOpen && (
                  <div style={{
                    padding: '14px', borderTop: '1px solid hsl(250 100% 92%)',
                    display: 'flex', flexDirection: 'column', gap: '14px'
                  }}>

                    {/* Row 1: Delay */}
                    <div>
                      <label style={{
                        display: 'block', fontSize: '10px', fontWeight: 700,
                        color: 'var(--slate-500)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: '6px'
                      }}>
                        Send After
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const { value: delayVal, unit: delayUnit } = parseDelay(step.delayDays);
                          return (
                            <>
                              <input
                                type="number"
                                min={1}
                                max={delayUnit === 'minutes' ? 1440 : delayUnit === 'hours' ? 72 : 30}
                                value={delayVal}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  let newDelayDays = val;
                                  if (delayUnit === 'minutes') newDelayDays = val / 1440;
                                  else if (delayUnit === 'hours') newDelayDays = val / 24;
                                  handleChange(idx, 'delayDays', newDelayDays);
                                }}
                                style={{
                                  width: '70px', padding: '6px 10px', fontSize: '14px', fontWeight: 700,
                                  border: '1px solid hsl(210 32% 88%)', borderRadius: '8px',
                                  background: '#fff', color: 'var(--slate-800)', textAlign: 'center', outline: 'none'
                                }}
                              />
                              <select
                                value={delayUnit}
                                onChange={(e) => {
                                  const newUnit = e.target.value;
                                  let newDelayDays = delayVal;
                                  if (newUnit === 'minutes') newDelayDays = delayVal / 1440;
                                  else if (newUnit === 'hours') newDelayDays = delayVal / 24;
                                  handleChange(idx, 'delayDays', newDelayDays);
                                }}
                                style={{
                                  padding: '6px 10px', fontSize: '12px', fontWeight: 600,
                                  border: '1px solid hsl(210 32% 88%)', borderRadius: '8px',
                                  background: '#fff', color: 'var(--slate-700)', outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="minutes">Minute{delayVal !== 1 ? 's' : ''}</option>
                                <option value="hours">Hour{delayVal !== 1 ? 's' : ''}</option>
                                <option value="days">Day{delayVal !== 1 ? 's' : ''}</option>
                              </select>
                              <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                                after original email is sent
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Row 2: Conditions multi-select */}
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <label style={{
                          fontSize: '10px', fontWeight: 700, color: 'var(--slate-500)',
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          Send If Recipient… (select one or more)
                        </label>

                        {/* AND/OR toggle — only visible if 2+ conditions selected */}
                        {(step.conditions || []).length >= 2 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                            {['AND', 'OR'].map(logic => (
                              <button
                                key={logic}
                                onClick={() => handleChange(idx, 'condition_logic', logic)}
                                style={{
                                  padding: '3px 10px', fontSize: '10px', fontWeight: 700,
                                  border: '1px solid hsl(250 100% 85%)',
                                  background: step.condition_logic === logic ? 'var(--indigo-600)' : '#fff',
                                  color: step.condition_logic === logic ? '#fff' : 'var(--indigo-600)',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                  borderRadius: logic === 'AND' ? '6px 0 0 6px' : '0 6px 6px 0',
                                  marginLeft: logic === 'OR' ? '-1px' : '0'
                                }}
                              >
                                {logic}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Condition checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {CONDITION_OPTIONS.map(opt => {
                          const isSelected = (step.conditions || ['not_opened']).includes(opt.value);
                          const isOnlyOne = (step.conditions || []).length === 1 && isSelected;
                          return (
                            <div
                              key={opt.value}
                              onClick={() => !isOnlyOne && toggleCondition(idx, opt.value)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', borderRadius: '8px',
                                border: `1.5px solid ${isSelected ? opt.border : 'hsl(210 32% 91%)'}`,
                                background: isSelected ? opt.bg : '#fff',
                                cursor: isOnlyOne ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                opacity: isOnlyOne ? 0.65 : 1
                              }}
                            >
                              {/* Custom checkbox */}
                              <div style={{
                                width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
                                border: `2px solid ${isSelected ? opt.color : 'hsl(210 32% 80%)'}`,
                                background: isSelected ? opt.color : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s'
                              }}>
                                {isSelected && (
                                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>

                              <span style={{ fontSize: '13px' }}>{opt.icon}</span>

                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '12px', fontWeight: 700,
                                  color: isSelected ? opt.color : 'var(--slate-700)'
                                }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--slate-500)', marginTop: '1px' }}>
                                  {opt.description}
                                </div>
                              </div>

                              {isSelected && isOnlyOne && (
                                <span style={{ fontSize: '9px', color: opt.color, fontWeight: 600 }}>
                                  REQUIRED
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Logic preview label */}
                      {(step.conditions || []).length >= 2 && (
                        <div style={{
                          marginTop: '8px', padding: '6px 10px',
                          background: 'hsl(250 100% 97%)',
                          border: '1px solid hsl(250 100% 88%)',
                          borderRadius: '7px', fontSize: '11px',
                          color: '#6366f1', fontWeight: 600
                        }}>
                          📌 Will send if recipient is: <strong>{getConditionSummary(step)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Subject */}
                    <div>
                      <label style={{
                        display: 'block', fontSize: '10px', fontWeight: 700,
                        color: 'var(--slate-500)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: '5px'
                      }}>
                        Subject Line
                      </label>
                      <input
                        type="text"
                        placeholder="Re: [Original subject] — following up"
                        value={step.subject}
                        onChange={(e) => handleChange(idx, 'subject', e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '13px',
                          border: '1px solid hsl(210 32% 88%)', borderRadius: '8px',
                          background: '#fff', color: 'var(--slate-800)',
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label style={{
                        display: 'block', fontSize: '10px', fontWeight: 700,
                        color: 'var(--slate-500)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: '5px'
                      }}>
                        Email Body{' '}
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                          (supports {'{{name}}'}, {'{{email}}'}, {'{{company}}'})
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder={`Hi {{name}},\n\nI wanted to follow up on my previous email…`}
                        value={step.body}
                        onChange={(e) => handleChange(idx, 'body', e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '13px',
                          border: '1px solid hsl(210 32% 88%)', borderRadius: '8px',
                          background: '#fff', color: 'var(--slate-800)',
                          outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                          fontFamily: 'inherit', lineHeight: 1.5
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add step button */}
          {steps.length < MAX_STEPS && (
            <button
              onClick={handleAdd}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600,
                border: '1.5px dashed hsl(250 100% 85%)', borderRadius: '10px',
                background: 'hsl(250 100% 98.5%)', color: 'var(--indigo-600)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Plus size={14} /> Add Follow-up Step ({steps.length}/{MAX_STEPS} used)
            </button>
          )}

          {steps.length >= MAX_STEPS && (
            <div style={{
              fontSize: '11px', color: 'var(--slate-400)', textAlign: 'center',
              padding: '6px', background: 'hsl(210 40% 98%)', borderRadius: '8px',
              border: '1px solid hsl(210 32% 92%)'
            }}>
              Maximum 3 follow-up steps reached (recommended to avoid spam filters)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
