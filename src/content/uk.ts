import { buildContent } from './index';

const ts = import.meta.glob<string>('./uk/typescript/*.md', { query: '?raw', import: 'default', eager: true });
const pw = import.meta.glob<string>('./uk/playwright/*.md', { query: '?raw', import: 'default', eager: true });

export default buildContent('uk', ts, pw, {
  typescript: 'Від «воно компілюється» до типів, що ловлять справжні баги: звуження, дженерики, інструменти рівня типів і налаштування, на яких спотикаються всі.',
  playwright: 'Надійні end-to-end тести: локатори, автоочікування, фікстури, автентифікація, керування мережею, налагодження та боротьба з нестабільними тестами.',
});
