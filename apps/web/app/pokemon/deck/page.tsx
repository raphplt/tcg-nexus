import React, { useState } from "react";

"use client";

const sampleCards = ["Pikachu", "Salamèche", "Bulbizarre", "Carapuce", "Dracaufeu"];

export default function Page() {
    const [count, setCount] = useState(0);
    const [visible, setVisible] = useState(true);
    const [deck, setDeck] = useState<string[]>(sampleCards);
    const [last, setLast] = useState<string | null>(null);

    const draw = () => {
        if (deck.length === 0) return;
        const card = deck[Math.floor(Math.random() * deck.length)];
        setDeck((prev) => prev.filter((c) => c !== card));
        setLast(card);
    };

    const reset = () => {
        setDeck(sampleCards);
        setLast(null);
    };

    return (
        <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
            <h1>deck Pokémon</h1>
            <p>Compteur : {count}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setCount((c) => c + 1)}>+1</button>
                <button onClick={() => setCount((c) => c - 1)}>-1</button>
                <button onClick={() => setCount(0)}>Remise à zéro</button>
            </div>

            <div style={{ marginBottom: 12 }}>
                <button onClick={() => setVisible((v) => !v)}>{visible ? "Masquer" : "Afficher"}</button>
            </div>

            {visible && (
                <section style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}>
                    <h2>Deck</h2>
                    <ul>
                        {deck.map((card) => (
                            <li key={card}>{card}</li>
                        ))}
                    </ul>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={draw} disabled={deck.length === 0}>
                            Piocher une carte
                        </button>
                        <button onClick={reset}>Réinitialiser le deck</button>
                    </div>
                    <p>Dernière carte : {last ?? "Aucune"}</p>
                </section>
            )}

            <footer style={{ marginTop: 20, color: "#6b7280" }}>Exemple simple pour dev</footer>
        </main>
    );
}