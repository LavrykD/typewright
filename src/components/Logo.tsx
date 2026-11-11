export function Logo() {
  return (
    <a href="#/" className="logo" aria-label="Typewright home">
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#0c8c5e" />
        <path d="M8 10h11M13.5 10v13" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="m19 17 3 5 3-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span>Typewright</span>
    </a>
  );
}
