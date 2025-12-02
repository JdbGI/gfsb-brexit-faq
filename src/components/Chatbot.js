"use client";
import { useState, useRef, useEffect } from 'react';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Hello! I can answer questions about the Gibraltar Brexit deal. Ask me anything!' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.text }),
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, something went wrong." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--gfsb-black)',
                    color: 'var(--gfsb-white)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                }}
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '7rem',
                    right: '2rem',
                    width: '350px',
                    height: '500px',
                    background: 'var(--gfsb-white)',
                    border: '2px solid var(--gfsb-black)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000,
                    boxShadow: '10px 10px 0px rgba(0,0,0,0.2)' // Brutalist shadow
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        background: 'var(--gfsb-cyan)',
                        borderBottom: '2px solid var(--gfsb-black)',
                        fontWeight: 'bold'
                    }}>
                        GFSB AI Assistant
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        padding: '1rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                background: msg.role === 'user' ? 'var(--gfsb-black)' : '#f0f0f0',
                                color: msg.role === 'user' ? 'var(--gfsb-white)' : 'var(--gfsb-black)',
                                padding: '0.8rem',
                                maxWidth: '80%',
                                border: '1px solid var(--gfsb-black)',
                                borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0'
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        {isTyping && <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>AI is typing...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '1rem',
                        borderTop: '2px solid var(--gfsb-black)',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a question..."
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid var(--gfsb-black)'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            style={{
                                background: 'var(--gfsb-black)',
                                color: 'var(--gfsb-white)',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
