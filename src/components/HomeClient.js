"use client";

import { useState } from 'react';
import Footer from "@/components/Footer";
import Image from 'next/image';

export default function Home() {
    const [chatInput, setChatInput] = useState('');
    const [chatResponse, setChatResponse] = useState(null);
    const [sourcesUsed, setSourcesUsed] = useState([]);
    const [isTyping, setIsTyping] = useState(false);

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
        <main className="gfsb-grid-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Hero Section */}
            <div className="gfsb-grid-item" style={{ gridColumn: "span 12", padding: "4rem 2rem", borderBottom: "1px solid var(--gfsb-black)", flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                <div style={{ marginBottom: '2rem', position: 'relative', width: '300px', height: '100px' }}>
                    <Image
                        src="/images/gfsb-logo.png"
                        alt="GFSB Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>

                <h1 style={{ fontSize: "3rem", textTransform: "uppercase", textAlign: 'center', marginBottom: '1rem' }}>
                    Gibraltar Brexit<br />Information Center
                </h1>

                <p style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '2rem', opacity: 0.8, fontSize: '1.1rem' }}>
                    Ask questions about Gibraltar-EU relations, treaties, and Brexit implications.
                    Answers are sourced from official documents and will cite their origins.
                </p>

                <form onSubmit={handleHeroSearch} style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex' }}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '1.5rem',
                                fontSize: '1.2rem',
                                border: '2px solid var(--gfsb-black)',
                                borderRadius: 0
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isTyping}
                            style={{
                                padding: '0 2rem',
                                background: 'var(--gfsb-black)',
                                color: 'var(--gfsb-white)',
                                border: 'none',
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
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
                                <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{chatResponse}</div>

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
            </div>

            {/* Footer */}
            <Footer />

            {/* Blue striped pattern at bottom */}
            <div className="gfsb-grid-item gfsb-stripes" style={{ gridColumn: "span 12", height: "50px", marginTop: '0' }}></div>
        </main>
    );
}
