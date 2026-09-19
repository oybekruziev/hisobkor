import test from 'node:test';
import assert from 'node:assert/strict';
import {companyTitle} from '../src/format.mjs';

test('company title appends the legal form only when the name lacks it', () => {
  assert.equal(companyTitle({name: 'Atlas Savdo', legal: 'MChJ'}), 'Atlas Savdo MChJ');
  assert.equal(companyTitle({name: 'Test MChJ', legal: 'MChJ'}), 'Test MChJ');
  assert.equal(companyTitle({name: '"Atlas" mchj', legal: 'MChJ'}), '"Atlas" mchj');
  assert.equal(companyTitle({name: 'Atlas', legal: 'Boshqa'}), 'Atlas');
  assert.equal(companyTitle({name: 'Atlas', legal: ''}), 'Atlas');
});
