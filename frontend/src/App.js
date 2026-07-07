import { useEffect, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'fake-url-shortener-links';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

function App() {
  const [inputValue, setInputValue] = useState('');
  const [links, setLinks] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isWorking, setIsWorking] = useState(false);

  const syncCounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/links`);
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const lookup = new Map(payload.map((item) => [item.key, item]));
      setLinks((current) =>
        current.map((entry) => {
          const updated = lookup.get(entry.key);
          if (!updated) {
            return entry;
          }
          return { ...entry, clickCount: updated.clickCount };
        })
      );
    } catch (error) {
      console.warn('Unable to sync counts', error);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setLinks(parsed);
        if (parsed.length) {
          syncCounts();
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }, [links]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    const candidate = inputValue.trim();

    if (!candidate) {
      setStatus({ type: 'error', message: 'Please enter a URL to shorten.' });
      return;
    }

    try {
      new URL(candidate);
    } catch {
      setStatus({ type: 'error', message: 'That does not look like a valid URL.' });
      return;
    }

    setIsWorking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: candidate }),
      });

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload?.message || 'Could not shorten the URL.');
      }

      const payload = await response.json();
      const normalized = {
        key: payload.key,
        originalUrl: payload.originalUrl || candidate,
        shortUrl: payload.shortUrl,
        clickCount: payload.clickCount ?? 0,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };

      setLinks((prev) => {
        const withoutDuplicates = prev.filter((entry) => entry.key !== normalized.key);
        return [normalized, ...withoutDuplicates];
      });

      setStatus({ type: 'success', message: 'Short link saved locally.' });
      setInputValue('');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'We could not complete your request.',
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleVisit = async (entry) => {
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/redirect/${entry.key}`);
      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload?.message || 'This link no longer exists.');
      }

      const payload = await response.json();
      setLinks((prev) =>
        prev.map((link) =>
          link.key === entry.key
            ? { ...link, clickCount: payload.clickCount ?? link.clickCount }
            : link
        )
      );
      window.open(payload.originalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'We could not open this link at the moment.',
      });
    }
  };

  const handleCopy = async (shortUrl) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setStatus({ type: 'success', message: 'Short URL copied to clipboard.' });
    } catch {
      setStatus({ type: 'error', message: 'Clipboard access is not available.' });
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Fake URL Shortener</p>
        <h1>Track clicks and keep your history in localStorage.</h1>
        <p className="subtitle">
          Generate a fake short link from any long URL. The backend issues the token and tallies the clicks, while the frontend keeps your saved list in
          localStorage.
        </p>
        {status.message && <p className={`status-pill ${status.type}`}>{status.message}</p>}
      </header>

      <main className="content">
        <form className="shorten-form" onSubmit={handleSubmit}>
          <label htmlFor="longUrl">Long URL</label>
          <div className="input-row">
            <input
              id="longUrl"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="https://example.com/a-very-long-uri"
              type="url"
              autoComplete="off"
            />
            <button type="submit" disabled={isWorking}>
              {isWorking ? 'Shortening…' : 'Shorten URL'}
            </button>
          </div>
        </form>

        <section className="links-panel">
          <div className="panel-header">
            <div>
              <h2>Your saved links</h2>
              <small>
                History lives in localStorage under <code>{STORAGE_KEY}</code>.
              </small>
            </div>
          </div>

          {links.length === 0 ? (
            <p className="empty-state">Add a link above to build your history.</p>
          ) : (
            <div className="links-grid">
              {links.map((entry) => (
                <article key={entry.key} className="link-card">
                  <div className="link-meta">
                    <span className="label">Original URL</span>
                    <p className="value">{entry.originalUrl}</p>
                  </div>

                  <div className="link-meta">
                    <span className="label">Short link</span>
                    <p className="value short">
                      <a href={entry.shortUrl} target="_blank" rel="noreferrer">
                        {entry.shortUrl}
                      </a>
                    </p>
                  </div>

                  <div className="badges">
                    <span className="badge">Clicks: {entry.clickCount ?? 0}</span>
                    <span className="badge muted">#{entry.key}</span>
                  </div>

                  <div className="card-actions">
                    <button type="button" onClick={() => handleVisit(entry)}>
                      Visit link
                    </button>
                    <button type="button" onClick={() => handleCopy(entry.shortUrl)}>
                      Copy short URL
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          Backend API base: <strong>{API_BASE_URL}</strong>
        </p>
      </footer>
    </div>
  );
}

export default App;
