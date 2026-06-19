function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Warhammer 40,000 · MVP</p>
        <h1>Crusade List Builder</h1>
        <p className="subtitle">Black Templars</p>
      </header>

      <section className="placeholder-card">
        <p>
          Phase 0 scaffold is live. Deploy pipeline, tooling, and project
          structure are in place.
        </p>
        <p className="muted">
          Next up: data format and a small Black Templars seed.
        </p>
      </section>

      <footer className="app-footer">
        <span>No account required · lists stay on this device</span>
      </footer>
    </main>
  )
}

export default App
