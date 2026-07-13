const SUPPORTED_ACTIONS = new Set(['replace_text', 'replace_attribute', 'run_command']);

export function validateProposal(proposal, snapshot) {
    const errors = [];
    if (!proposal || typeof proposal !== 'object') errors.push('Proposal must be an object.');
    if (!SUPPORTED_ACTIONS.has(proposal?.action)) errors.push('Unsupported proposal action.');
    if (!Number.isInteger(proposal?.revision)) errors.push('Proposal revision is required.');
    if (proposal?.revision !== snapshot?.revision) errors.push('Proposal targets an outdated document revision.');
    if (proposal?.action !== 'run_command' && !Array.isArray(proposal?.targetPath)) {
        errors.push('A document target path is required.');
    }
    if (proposal?.action === 'replace_text' && typeof proposal?.expectedText !== 'string') {
        errors.push('Expected text is required for safe replacement.');
    }
    if (proposal?.action === 'run_command' && typeof proposal?.commandId !== 'string') {
        errors.push('A command id is required.');
    }
    return Object.freeze({ valid: errors.length === 0, errors });
}

export function createProposalEnvelope({ proposal, explanation = '', model = '', promptVersion = '' }) {
    return Object.freeze({ proposal: Object.freeze({ ...proposal }), explanation, model, promptVersion });
}
