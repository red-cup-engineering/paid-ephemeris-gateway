import { iyappyCheckers } from './registry.mts';

function insertAtSelection(field: HTMLInputElement, value: string): void {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  field.value = `${field.value.slice(0, start)}${value}${field.value.slice(end)}`;
  field.focus();
  field.setSelectionRange(start + value.length, start + value.length);
}

export const iyappyTheme = {
  themeId: 'iyappy',
  checkers: iyappyCheckers,
  exerciseFenceLabels: ['iyappy-exercise'],
  presentation: { streak: false, halls: false, recallPercent: false, progressCount: true },
  createAnswerForm(document: Document, exercise: { kind: string; spec: { choices?: string[] } }) {
    const form = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = exercise.kind === 'person-recognition' ? 'Choose a person' : 'Type the form';
    const field = document.createElement(exercise.kind === 'person-recognition' ? 'select' : 'input');
    field.name = 'form';
    field.required = true;
    label.append(field);

    if (exercise.kind === 'person-recognition') {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose a person';
      placeholder.selected = true;
      placeholder.disabled = true;
      field.append(placeholder);
      for (const choice of exercise.spec.choices ?? []) {
        const option = document.createElement('option');
        option.value = choice;
        option.textContent = choice;
        field.append(option);
      }
    } else {
      field.type = 'text';
      field.lang = 'lkt';
      field.autocomplete = 'off';
      field.spellcheck = false;
      const characters = document.createElement('div');
      characters.setAttribute('aria-label', 'Lakota characters');
      for (const character of ['á', 'č', 'ȟ', 'í', 'ŋ']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = character;
        button.setAttribute('aria-label', `Insert ${character}`);
        button.addEventListener('click', () => insertAtSelection(field, character));
        characters.append(button);
      }
      form.append(label, characters);
      return { form, readAnswer: () => ({ form: field.value }) };
    }

    form.append(label);
    return { form, readAnswer: () => ({ form: field.value }) };
  },
};
