import test from 'node:test';
import assert from 'node:assert/strict';
import {companyTitle, formatDate, shiftPeriod, periodMonths} from '../src/format.mjs';

test('company title appends the legal form only when the name lacks it', () => {
  assert.equal(companyTitle({name: 'Atlas Savdo', legal: 'MChJ'}), 'Atlas Savdo MChJ');
  assert.equal(companyTitle({name: 'Test MChJ', legal: 'MChJ'}), 'Test MChJ');
  assert.equal(companyTitle({name: '"Atlas" mchj', legal: 'MChJ'}), '"Atlas" mchj');
  assert.equal(companyTitle({name: 'Atlas', legal: 'Boshqa'}), 'Atlas');
  assert.equal(companyTitle({name: 'Atlas', legal: ''}), 'Atlas');
});

test('formatDate renders dd.mm.yyyy', () => {
  assert.equal(formatDate('2026-09-19'), '19.09.2026');
  assert.equal(formatDate('2026-01-05'), '05.01.2026');
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('nima'), 'nima');
  assert.match(formatDate(new Date(2026, 8, 19, 10, 40).toISOString()), /^\d{2}\.\d{2}\.\d{4}$/);
});

test('shiftPeriod moves whole months and rolls the year', () => {
  assert.equal(shiftPeriod('2026-09', 1), '2026-10');
  assert.equal(shiftPeriod('2026-12', 1), '2027-01');
  assert.equal(shiftPeriod('2026-01', -1), '2025-12');
  assert.equal(shiftPeriod('2026-09', 0), '2026-09');
  assert.equal(shiftPeriod('yomon', 1), 'yomon');
  assert.equal(shiftPeriod('', 1), '');
});

test('periodMonths lists twelve padded Uzbek months', () => {
  const months = periodMonths();
  assert.equal(months.length, 12);
  assert.deepEqual(months[0], ['01', 'Yanvar']);
  assert.deepEqual(months[11], ['12', 'Dekabr']);
  assert.equal(new Set(months.map(m => m[1])).size, 12);
});
