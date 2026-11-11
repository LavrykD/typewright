import { buildContent } from './index';

const ts = import.meta.glob<string>('./typescript/*.md', { query: '?raw', import: 'default', eager: true });
const pw = import.meta.glob<string>('./playwright/*.md', { query: '?raw', import: 'default', eager: true });

export default buildContent('en', ts, pw, {
  typescript: 'From “it compiles” to types that catch real bugs — narrowing, generics, type-level tools and the config that trips everyone up.',
  playwright: 'Reliable end-to-end tests: locators, auto-waiting, fixtures, auth, network control, debugging and killing flakiness.',
});
