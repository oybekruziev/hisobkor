import test from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2, constantTimeEqual, hexToBytes, bytesToHex, verifyPassword} from '../worker/crypto.mjs';
import {eligibleDocument, MAX_WORKSPACE_BYTES, safeDocumentName, validateFile, validateWorkspaceState} from '../worker/validation.mjs';

const emptyState = () => ({companies: [], docs: [], activity: [], closed: [], profile: null, aiAuto: true});

test('Cloud worker workspace validation keeps the existing data contract', () => {
  assert.doesNotThrow(() => validateWorkspaceState(emptyState()));
  assert.throws(() => validateWorkspaceState({...emptyState(), docs: [{id: 'd1', company: 'other', title: 'Faktura', fileName: 'a.pdf', status: 'accepted'}]}), /Hujjat/);
  assert.equal(MAX_WORKSPACE_BYTES, 1024 * 1024);
});

test('file signatures are checked independently from the claimed MIME type', () => {
  assert.equal(validateFile(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 1]), 'application/pdf'), 'application/pdf');
  assert.throws(() => validateFile(new TextEncoder().encode('<html>'), 'application/pdf'), /PDF/);
  assert.throws(() => validateFile(Uint8Array.from([0x61, 0, 0x62]), 'text/csv'), /CSV/);
  assert.equal(safeDocumentName('../../hisob faktura', 'application/pdf'), '.._.._hisob faktura.pdf');
});

test('AI eligibility and filename are derived from persisted documents', () => {
  const doc = {id: 'doc-1', fileKey: 'file-1', fileName: 'invoice.pdf', status: 'review_required'};
  assert.equal(eligibleDocument(doc), true);
  assert.equal(eligibleDocument({...doc, demo: true}), false);
  assert.equal(eligibleDocument({...doc, status: 'missing'}), false);
});

test('PBKDF2 password records round-trip and reject another password', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2('correct horse battery staple', salt, 100_000);
  assert.equal(constantTimeEqual(derived, hexToBytes(bytesToHex(derived))), true);
  assert.equal(await verifyPassword('correct horse battery staple', bytesToHex(salt), bytesToHex(derived), 100_000), true);
  assert.equal(await verifyPassword('wrong', bytesToHex(salt), bytesToHex(derived), 100_000), false);
});
