export const canOfferPaperAbandonment = (position, runtime, request) => Boolean(
  position?.execution_mode === 'paper' && !position.abandoned_at &&
  !request?.stale && runtime?.open_position?.id === position.id &&
  runtime.paper_exit_diagnostics?.exit_block_reason === 'legacy_paper_execution_config_review_required' &&
  runtime.paper_exit_diagnostics?.abandon_allowed === true
);

export const paperAbandonmentBody = positionId => ({confirm_abandon: true, position_id: positionId});
