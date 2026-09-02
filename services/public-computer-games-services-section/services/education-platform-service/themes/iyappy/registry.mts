import type { CheckerRegistry, Verdict } from '../../src/checker.mts';

export const SOURCE = Object.freeze({
  label: 'LDL 121: Intensive Lakota/Dakota for Beginners',
  url: 'https://wotakuye.weebly.com/uploads/2/3/7/4/23749479/ldl121_packet.pdf',
  sha256: '1fc27e5a5603290df67dd9ca7eb8349b15d5b9cca8f661ad084bc055880d0b22',
  yuhá: 'printed p. 19 / PDF p. 20, “Conjugation of yuhá”',
  čhíŋ: 'printed p. 45 / PDF p. 46, “Conjugation of čhíŋ”',
});

export const FORMS = Object.freeze([
  { id: 'yuha-1sg', lemma: 'yuhá', gloss: 'have something', person: '1st person singular', form: 'bluhá', source: SOURCE.yuhá },
  { id: 'yuha-2sg', lemma: 'yuhá', gloss: 'have something', person: '2nd person singular', form: 'luhá', source: SOURCE.yuhá },
  { id: 'yuha-3sg', lemma: 'yuhá', gloss: 'have something', person: '3rd person singular', form: 'yuhá', source: SOURCE.yuhá },
  { id: 'ching-1sg', lemma: 'čhíŋ', gloss: 'want something', person: '1st person singular', form: 'wačhíŋ', source: SOURCE.čhíŋ },
  { id: 'ching-2sg', lemma: 'čhíŋ', gloss: 'want something', person: '2nd person singular', form: 'yačhíŋ', source: SOURCE.čhíŋ },
  { id: 'ching-3sg', lemma: 'čhíŋ', gloss: 'want something', person: '3rd person singular', form: 'čhíŋ', source: SOURCE.čhíŋ },
]);

const BY_ID = new Map(FORMS.map((form) => [form.id, form]));
type FormSpec = { formId: string };

function answerForm(answer: unknown): string | null {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object' && typeof (answer as { form?: unknown }).form === 'string') {
    return (answer as { form: string }).form;
  }
  return null;
}

function formFor(spec: FormSpec) {
  return BY_ID.get(spec.formId);
}

export function personRecognitionChecker(spec: FormSpec, answer: unknown): Verdict {
  const form = formFor(spec);
  const selected = answerForm(answer);
  if (!form) return { pass: false, diagnosis: 'This exercise names no witnessed form.' };
  const pass = selected === form.person;
  return { pass, diagnosis: pass ? 'Correct.' : `Try again: ${form.form} is the ${form.person} form in this lesson.` };
}

/** NFC plus surrounding whitespace only: this checker does not infer productive grammar. */
export function formRecallChecker(spec: FormSpec, answer: unknown): Verdict {
  const form = formFor(spec);
  const entered = answerForm(answer);
  if (!form) return { pass: false, diagnosis: 'This exercise names no witnessed form.' };
  const pass = entered !== null && entered.trim().normalize('NFC') === form.form.normalize('NFC');
  return { pass, diagnosis: pass ? 'Correct.' : `Try again: enter the witnessed form ${form.form}.` };
}

export const iyappyCheckers: CheckerRegistry = {
  'person-recognition': personRecognitionChecker,
  'form-recall': formRecallChecker,
};
