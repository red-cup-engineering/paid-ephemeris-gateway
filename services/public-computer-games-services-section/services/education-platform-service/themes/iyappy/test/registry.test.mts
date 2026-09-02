import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formRecallChecker, personRecognitionChecker } from '../registry.mts';

test('person recognition accepts the witnessed person and rejects another person', () => {
  assert.equal(personRecognitionChecker({ formId: 'yuha-1sg' }, { form: '1st person singular' }).pass, true);
  assert.equal(personRecognitionChecker({ formId: 'yuha-1sg' }, { form: '2nd person singular' }).pass, false);
});

test('form recall accepts only NFC-normalized, trimmed witnessed form', () => {
  assert.equal(formRecallChecker({ formId: 'ching-1sg' }, { form: '  wac\u030chi\u0301ŋ  ' }).pass, true);
  assert.equal(formRecallChecker({ formId: 'ching-1sg' }, { form: 'wachiŋ' }).pass, false);
  assert.equal(formRecallChecker({ formId: 'ching-1sg' }, { form: 'wačhíŋ šni' }).pass, false);
});
