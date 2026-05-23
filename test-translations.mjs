// Test translation loading
import { readFileSync } from 'fs';

const deTranslations = JSON.parse(readFileSync('./src/locales/de.json', 'utf8'));
const enTranslations = JSON.parse(readFileSync('./src/locales/en.json', 'utf8'));

console.log('English translations has modes:', 'modes' in enTranslations);
console.log('German translations has modes:', 'modes' in deTranslations);

if (enTranslations.modes) {
  console.log('English mode.money exists:', 'money' in enTranslations.modes);
  console.log('English mode.money.prompts:', enTranslations.modes.money?.prompts);
}

if (deTranslations.modes) {
  console.log('German mode.money exists:', 'money' in deTranslations.modes);
  console.log('German mode.money.prompts:', deTranslations.modes.money?.prompts);
  console.log('German mode.money.focus:', deTranslations.modes.money?.focus);
}
