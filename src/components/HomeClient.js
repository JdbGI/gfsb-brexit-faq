"use client";

import { useState } from 'react';
import FAQContainer from "@/components/FAQContainer";
import Chatbot from "@/components/Chatbot";
import Image from 'next/image';

export default function Home({ faqs }) {
    const [showFaqs, setShowFaqs] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatResponse, setChatResponse] = useState(null);
    const [isTyping, setIsTyping] = useState(false);

    const handleHeroSearch = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setIsTyping(true);
        setChatResponse(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: chatInput }),
            });
            const data = await response.json();
            setChatResponse(data.reply);
        } catch (error) {
            setChatResponse("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <main className="gfsb-grid-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Hero Section */}
            <div className="gfsb-grid-item" style={{ gridColumn: "span 12", padding: "4rem 2rem", borderBottom: "1px solid var(--gfsb-black)", flex: showFaqs ? '0 0 auto' : '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transition: 'all 0.5s ease' }}>

                <div style={{ marginBottom: '2rem', position: 'relative', width: '300px', height: '100px' }}>
                    <Image
                        src="/images/gfsb-logo.png"
                        alt="GFSB Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>

                <h1 style={{ fontSize: "3rem", textTransform: "uppercase", textAlign: 'center', marginBottom: '2rem' }}>
                    Gibraltar Brexit<br />Information Center
                </h1>

                <form onSubmit={handleHeroSearch} style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex' }}>
                        <input
                            type="text"
                            placeholder="Ask a question about the deal..."
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
                        <h3 style={{ borderBottom: '1px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>AI Answer:</h3>
                        {isTyping ? <p>Thinking...</p> : <p style={{ lineHeight: 1.6 }}>{chatResponse}</p>}
                    </div>
                )}

                <button
                    onClick={() => setShowFaqs(!showFaqs)}
                    style={{
                        marginTop: '3rem',
                        background: 'transparent',
                        border: '1px solid var(--gfsb-black)',
                        padding: '1rem 2rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                >
                    {showFaqs ? 'Hide Full Database ↑' : 'Browse Full FAQ Database ↓'}
                </button>
            </div>

            {/* FAQ List Section */}
            {showFaqs && (
                <div className="gfsb-grid-item" style={{ gridColumn: "span 12", padding: 0, animation: 'fadeIn 0.5s' }}>
                    <FAQContainer initialFaqs={faqs} />
                </div>
            )}

            <div className="gfsb-grid-item gfsb-stripes" style={{ gridColumn: "span 12", height: "50px", marginTop: 'auto' }}></div>

            {/* Keep the floating chatbot as a secondary option or remove it? 
          User asked for "LLM chatbot style input as the primary question bar".
          I will keep it hidden if the main input is used, or just remove it to avoid confusion.
          For now, I'll remove the floating widget since the main UI is now the chatbot.
      */}
        </main>
    );
}
