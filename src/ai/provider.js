/** Provider-neutral contract implemented by remote or local AI adapters. */
export class AIProvider {
    async propose() {
        throw new Error('AIProvider.propose must be implemented by an adapter.');
    }
}
