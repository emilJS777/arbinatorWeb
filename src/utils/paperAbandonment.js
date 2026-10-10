export const canOfferPaperAbandonment = (position, runtime, request) => Boolean(
  position?.execution_mode === 'paper' && !position.abandoned_at &&
  !request?.stale && runtime?.open_position?.id === position.id &&
  runtime.paper_exit_diagnostics?.exit_block_reason === 'legacy_paper_execution_config_review_required' &&
  runtime.paper_exit_diagnostics?.abandon_allowed === true
);

export const paperAbandonmentBody = positionId => ({confirm_abandon: true, position_id: positionId});

export const paperCloseBlockReason = (position, runtime, request) => {
  if (position?.execution_mode !== 'paper' || position.abandoned_at) return null;
  if (request?.stale || runtime?.open_position?.id !== position.id) return 'Refresh current position state before closing';
  return runtime.paper_exit_diagnostics?.exit_block_reason === 'legacy_paper_execution_config_review_required'
    ? 'legacy_paper_execution_config_review_required' : null;
};

export const paperAbandonmentUnavailableReason = (position, runtime, request) => {
  if (paperCloseBlockReason(position, runtime, request) !== 'legacy_paper_execution_config_review_required') return null;
  const diagnostics = runtime.paper_exit_diagnostics;
  if (diagnostics.abandon_allowed === undefined) return 'Abandon action unavailable; update backend and database, then refresh';
  return diagnostics.abandon_block_reason || null;
};
