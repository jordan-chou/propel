import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRegistry, createCommandResult } from '../../src/commands/command-registry.js';

test('registers and executes a command', async () => {
    const registry = new CommandRegistry().register('document.test', {
        execute: ({ html }) => createCommandResult({ html: html.toUpperCase(), summary: 'Converted' })
    });
    assert.equal((await registry.execute('document.test', { html: 'hello' })).html, 'HELLO');
});

test('rejects duplicate and unknown commands', async () => {
    const registry = new CommandRegistry().register('test', { execute() {} });
    assert.throws(() => registry.register('test', { execute() {} }), /already registered/);
    await assert.rejects(registry.execute('missing'), /Unknown command/);
});
