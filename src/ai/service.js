import { validateProposal } from './proposals.js';

export class AIProposalService {
    constructor({ provider, commandRegistry }) {
        this.provider = provider;
        this.commandRegistry = commandRegistry;
    }

    async suggest({ snapshot, task, context = {}, signal }) {
        // Only the explicitly selected context is sent. Authentication belongs on a server adapter.
        const response = await this.provider.propose({ snapshot, task, context, signal });
        const validation = validateProposal(response.proposal, snapshot);
        return Object.freeze({ ...response, validation });
    }

    async applyCommandProposal(proposal, context) {
        const validation = validateProposal(proposal, context.snapshot);
        if (!validation.valid) throw new Error(validation.errors.join(' '));
        if (proposal.action !== 'run_command') throw new Error('Proposal requires user-reviewed document editing.');
        return this.commandRegistry.execute(proposal.commandId, context);
    }
}
