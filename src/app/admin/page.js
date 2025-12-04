"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const ADMIN_PASSWORD = "gfsb@barton.gi";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState(false);

    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const fileInputRef = useRef(null);

    // Form state
    const [sourceName, setSourceName] = useState('');
    const [sourceDate, setSourceDate] = useState('');
    const [sourceLink, setSourceLink] = useState('');
    const [rawData, setRawData] = useState('');

    // Check session storage on load
    useEffect(() => {
        const authenticated = sessionStorage.getItem('admin_authenticated');
        if (authenticated === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    // Fetch sources on load (only if authenticated)
    useEffect(() => {
        if (isAuthenticated) {
            fetchSources();
        }
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_authenticated', 'true');
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    // Login screen
    if (!isAuthenticated) {
        return (
            <main className="gfsb-grid-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    background: 'var(--gfsb-white)',
                    border: '2px solid var(--gfsb-black)',
                    padding: '3rem',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '8px 8px 0 rgba(0,0,0,1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ position: 'relative', width: '150px', height: '50px', margin: '0 auto 1rem' }}>
                            <Image
                                src="/images/gfsb-logo.png"
                                alt="GFSB Logo"
                                fill
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                        <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>Admin Access</h1>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="Enter admin password"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: authError ? '2px solid #dc3545' : '1px solid var(--gfsb-black)',
                                    fontSize: '1rem',
                                }}
                                autoFocus
                            />
                            {authError && (
                                <p style={{ color: '#dc3545', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                    Incorrect password
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'var(--gfsb-black)',
                                color: 'var(--gfsb-white)',
                                border: 'none',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                            }}
                        >
                            Login
                        </button>
                    </form>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <a href="/" style={{ color: '#666', fontSize: '0.9rem' }}>
                            ← Back to Chatbot
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    const fetchSources = async () => {
        try {
            const response = await fetch('/api/sources');
            const data = await response.json();
            setSources(data.sources || []);
        } catch (error) {
            console.error('Error fetching sources:', error);
            setMessage({ type: 'error', text: 'Failed to load sources' });
        } finally {
            setLoading(false);
        }
    };

    // Parse frontmatter from markdown
    const parseFrontmatter = (content) => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        if (match) {
            const frontmatter = {};
            const frontmatterLines = match[1].split('\n');

            frontmatterLines.forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    frontmatter[key] = value;
                }
            });

            return {
                frontmatter,
                content: match[2].trim()
            };
        }

        return { frontmatter: {}, content: content.trim() };
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.md')) {
            setMessage({ type: 'error', text: 'Please upload a .md (Markdown) file' });
            return;
        }

        try {
            const text = await file.text();
            const { frontmatter, content } = parseFrontmatter(text);

            // Auto-fill form fields from frontmatter
            setSourceName(frontmatter.source_name || frontmatter.title || file.name.replace('.md', ''));
            setSourceDate(frontmatter.source_date || frontmatter.date || '');
            setSourceLink(frontmatter.source_link || frontmatter.link || frontmatter.url || '');
            setRawData(content);

            setMessage({
                type: 'success',
                text: `Loaded "${file.name}" - review the fields below and click "Add Source" to save`
            });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to read file' });
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceName,
                    sourceDate,
                    sourceLink,
                    rawData,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: data.message });
                // Clear form
                setSourceName('');
                setSourceDate('');
                setSourceLink('');
                setRawData('');
                // Refresh sources list
                fetchSources();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to add source' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete source "${name}"?`)) return;

        try {
            const response = await fetch(`/api/sources?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Source deleted' });
                fetchSources();
            } else {
                setMessage({ type: 'error', text: 'Failed to delete source' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete source' });
        }
    };

    return (
        <main className="gfsb-grid-container" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="gfsb-grid-item" style={{ gridColumn: 'span 12' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ position: 'relative', width: '150px', height: '50px' }}>
                        <Image
                            src="/images/gfsb-logo.png"
                            alt="GFSB Logo"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                    <h1 style={{ fontSize: '2rem', textTransform: 'uppercase' }}>Source Management</h1>
                </div>

                {/* Message */}
                {message && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                        color: message.type === 'success' ? '#155724' : '#721c24',
                    }}>
                        {message.text}
                    </div>
                )}

                {/* File Upload Section */}
                <div style={{
                    background: '#f8f9fa',
                    border: '2px dashed var(--gfsb-black)',
                    padding: '2rem',
                    marginBottom: '2rem',
                    textAlign: 'center',
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>Upload Markdown File</h2>
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                        Upload a .md file with optional frontmatter (source_name, source_date, source_link)
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        style={{
                            display: 'inline-block',
                            padding: '1rem 2rem',
                            background: 'var(--gfsb-black)',
                            color: 'var(--gfsb-white)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                        }}
                    >
                        Choose .md File
                    </label>
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#999' }}>
                        Example frontmatter format:<br />
                        <code style={{ background: '#eee', padding: '0.5rem', display: 'inline-block', marginTop: '0.5rem', textAlign: 'left' }}>
                            ---<br />
                            source_name: "Document Title"<br />
                            source_date: "2024-03-15"<br />
                            source_link: "https://..."<br />
                            ---
                        </code>
                    </p>
                </div>

                {/* Add Source Form */}
                <div style={{
                    background: 'var(--gfsb-white)',
                    border: '2px solid var(--gfsb-black)',
                    padding: '2rem',
                    marginBottom: '2rem',
                }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>
                        Add New Source
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Source Name *
                                </label>
                                <input
                                    type="text"
                                    value={sourceName}
                                    onChange={(e) => setSourceName(e.target.value)}
                                    placeholder="e.g., Gov.gi Press Release - March 2024"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--gfsb-black)',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Source Date (optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={sourceDate}
                                        onChange={(e) => setSourceDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid var(--gfsb-black)',
                                            fontSize: '1rem',
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Source Link (optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={sourceLink}
                                        onChange={(e) => setSourceLink(e.target.value)}
                                        placeholder="https://..."
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '1px solid var(--gfsb-black)',
                                            fontSize: '1rem',
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    Raw Data / Content *
                                </label>
                                <textarea
                                    value={rawData}
                                    onChange={(e) => setRawData(e.target.value)}
                                    placeholder="Paste the full transcript, document text, or content here..."
                                    required
                                    rows={12}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--gfsb-black)',
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                    }}
                                />
                                <small style={{ color: '#666' }}>
                                    {rawData.length.toLocaleString()} characters
                                </small>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: '1rem 2rem',
                                    background: submitting ? '#ccc' : 'var(--gfsb-black)',
                                    color: 'var(--gfsb-white)',
                                    border: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {submitting ? 'Adding Source...' : 'Add Source'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sources List */}
                <div style={{
                    background: 'var(--gfsb-white)',
                    border: '2px solid var(--gfsb-black)',
                    padding: '2rem',
                }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>
                        Existing Sources ({sources.length})
                    </h2>

                    {loading ? (
                        <p>Loading sources...</p>
                    ) : sources.length === 0 ? (
                        <p style={{ color: '#666' }}>No sources added yet. Add your first source above.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {sources.map((source) => (
                                <div
                                    key={source.id}
                                    style={{
                                        padding: '1rem',
                                        border: '1px solid #ddd',
                                        background: '#fafafa',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <strong>{source.sourceName}</strong>
                                            {source.sourceDate && (
                                                <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                                                    ({source.sourceDate})
                                                </span>
                                            )}
                                            {source.sourceLink && (
                                                <a
                                                    href={source.sourceLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ marginLeft: '0.5rem', color: 'blue' }}
                                                >
                                                    [Link]
                                                </a>
                                            )}
                                            <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                                {source.rawData?.substring(0, 200)}...
                                            </p>
                                            <small style={{ color: '#999' }}>
                                                {(source.totalLength || source.rawData?.length || 0).toLocaleString()} characters
                                                {source.chunks > 1 && ` (${source.chunks} chunks)`}
                                            </small>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(source.id, source.sourceName)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Back link */}
                <div style={{ marginTop: '2rem' }}>
                    <a href="/" style={{ color: 'var(--gfsb-black)' }}>
                        ← Back to Chatbot
                    </a>
                </div>
            </div>
        </main>
    );
}
