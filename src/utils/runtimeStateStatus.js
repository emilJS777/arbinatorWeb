const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const emptyRuntimeStateStatus = () => ({
  lastAttemptAt: null, lastSuccessfulAt: null, httpStatus: null,
  stale: false, error: '', incidentId: null, missingFields: [],
});

export function inspectRuntimeStateResponse(response, previous = emptyRuntimeStateStatus(), now = new Date().toISOString()) {
  const data = response?.data;
  const payload = data?.obj;
  const missingFields = isObject(payload) ? [
    ...(!['paper', 'live'].includes(payload.config?.execution_mode) ? ['config.execution_mode'] : []),
    ...(!isObject(payload.recovery_state) ? ['recovery_state'] : []),
    ...(typeof payload.enabled !== 'boolean' ? ['enabled'] : []),
    ...(!Object.hasOwn(payload, 'open_position') ? ['open_position'] : []),
    ...(!Object.hasOwn(payload, 'paper_exit_diagnostics') ? ['paper_exit_diagnostics'] : []),
  ] : ['state object'];
  // An older object remains inspectable, but null/error envelopes never replace good state.
  const accepted = data?.success === true && isObject(payload) && Object.keys(payload).length > 0;
  const status = {
    ...previous, lastAttemptAt: now, httpStatus: Number(response?.status || 0),
    stale: !accepted, error: accepted ? '' : 'State request failed; retained values are not current runtime evidence',
    incidentId: data?.incident_id || payload?.incident_id || null,
    missingFields: accepted ? missingFields : previous.missingFields,
  };
  if (accepted) status.lastSuccessfulAt = now;
  return {accepted, payload, status};
}
