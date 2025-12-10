"use client";

import { useState } from 'react';
import Footer from "@/components/Footer";
import Image from 'next/image';

export default function Home() {
    const [chatInput, setChatInput] = useState('');
    const [chatResponse, setChatResponse] = useState(null);
    const [sourcesUsed, setSourcesUsed] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

    // Helper function to convert URLs in text to clickable links
    const linkifyText = (text) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--gfsb-black)', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const handleHeroSearch = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setIsTyping(true);
        setChatResponse(null);
        setSourcesUsed([]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: chatInput }),
            });
            const data = await response.json();
            setChatResponse(data.reply);
            setSourcesUsed(data.sourcesUsed || []);
        } catch (error) {
            setChatResponse("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <main className="gfsb-grid-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            {/* Hero Section */}
            <div className="gfsb-grid-item" style={{ gridColumn: "span 12", padding: "2rem 1rem", borderBottom: "1px solid var(--gfsb-black)", flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                <div style={{ marginBottom: '1rem', position: 'relative', width: '200px', height: '70px' }}>
                    <Image
                        src="/images/gfsb-logo.png"
                        alt="GFSB Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>

                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', textTransform: "uppercase", textAlign: 'center', marginBottom: '0.75rem', lineHeight: 1.1 }}>
                    GFSB Brexit Q&amp;A –<br />Information Centre
                </h1>

                <p style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '1rem', opacity: 0.8, fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)', padding: '0 0.5rem' }}>
                    This AI-powered GFSB Brexit Information Centre lets you ask questions about the Gibraltar-UK-EU Brexit Treaty and negotiations, providing answers based solely on publicly available information. Sources include official Government of Gibraltar press releases, transcripts of interviews and media appearances by HMGOG Ministers and officials, and reporting or statements made by HMGOG Ministers and officials in the press.
                </p>

                <form onSubmit={handleHeroSearch} style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
                    <div style={{ display: 'flex' }}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                fontSize: '1rem',
                                border: '2px solid var(--gfsb-black)',
                                borderRadius: 0
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isTyping}
                            style={{
                                padding: '0 1.5rem',
                                background: 'var(--gfsb-black)',
                                color: 'var(--gfsb-white)',
                                border: 'none',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            {isTyping ? '...' : 'ASK'}
                        </button>
                    </div>
                </form>



                {/* AI Response Area */}
                {(chatResponse || isTyping) && (
                    <div style={{
                        marginTop: '2rem',
                        width: '100%',
                        maxWidth: '600px',
                        padding: '1.5rem',
                        background: 'var(--gfsb-white)',
                        border: '2px solid var(--gfsb-black)',
                        boxShadow: '8px 8px 0 rgba(0,0,0,1)'
                    }}>
                        <h3 style={{ borderBottom: '1px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Answer:</h3>
                        {isTyping ? (
                            <p>Searching sources...</p>
                        ) : (
                            <>
                                <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{linkifyText(chatResponse)}</div>

                                {/* Sources Used */}
                                {sourcesUsed.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #ccc' }}>
                                        <strong style={{ fontSize: '0.9rem', color: '#666' }}>Sources searched ({sourcesUsed.length}):</strong>
                                        <ul style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.85rem', color: '#666' }}>
                                            {sourcesUsed.map((source, i) => (
                                                <li key={i}>
                                                    {source.name}
                                                    {source.date && ` (${source.date})`}
                                                    {source.link && (
                                                        <a href={source.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.25rem', color: '#0066cc' }}>
                                                            [link]
                                                        </a>
                                                    )}
                                                    <span style={{ opacity: 0.5 }}> — {(source.score * 100).toFixed(0)}% match</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div style={{ maxWidth: '600px', marginTop: '1.5rem', padding: '0 0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                        Brexit information continues to evolve, and the data on which this tool relies will be updated from time to time. You should double-check any answer against the original source material.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                        Please note that the answers provided are for general information only and do not constitute legal advice. Users should take care before relying on them.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#666' }}>
                        You can also check out our other Brexit resources <a href="https://www.gfsb.gi/benefits/brexit/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gfsb-black)', textDecoration: 'underline' }}>here</a>.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* Blue striped pattern at bottom */}
            <div className="gfsb-grid-item gfsb-stripes" style={{ gridColumn: "span 12", height: "30px", marginTop: '0', flexShrink: 0 }}></div>
        </main>
    );
}
