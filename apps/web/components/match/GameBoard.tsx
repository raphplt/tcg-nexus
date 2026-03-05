'use client';

import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useMatchStore } from '../../store/useMatchStore';

interface GameBoardProps {
  matchId: string;
  playerId: string;
}

export default function GameBoard({ matchId, playerId }: GameBoardProps) {
  const { isConnected, setConnectionStatus, setMatchInfo, updateGameState, gameState } = useMatchStore();

  useEffect(() => {
    setMatchInfo(matchId, playerId);
    
    // Connect to WebSocket Gateway (assuming dev server port 3000)
    const socket = io('http://localhost:3000/match', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnectionStatus(true);
      socket.emit('join_match', { matchId, playerId });
    });

    socket.on('disconnect', () => {
      setConnectionStatus(false);
    });

    socket.on('state_update', (newState: any) => {
      updateGameState(newState);
    });
    
    socket.on('game_events', (events: any[]) => {
      // Here we would trigger animations, sounds, effects based on events
      console.log('Received Game Events:', events);
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId, playerId, setConnectionStatus, setMatchInfo, updateGameState]);

  if (!isConnected) {
    return <div className="flex bg-gray-900 justify-center items-center h-screen text-white">Connexion au serveur de combat...</div>;
  }

  // Placeholder Render
  return (
    <div className="w-full h-screen bg-gray-800 text-white flex flex-col p-4 font-sans">
      <div className="text-center font-bold text-xl mb-4 text-primary-400">Match: {matchId} | Tournoi Nexus</div>
      
      {/* Opponent Area */}
      <div className="flex-1 flex flex-col items-center justify-start border border-dashed border-gray-600 rounded p-4 mb-2">
        <h2 className="text-gray-400">Adversaire</h2>
        <div className="w-32 h-44 bg-gray-700 border border-gray-500 rounded mt-4 flex items-center justify-center">
          Actif
        </div>
      </div>
      
      {/* Player Area */}
      <div className="flex-1 flex flex-col items-center justify-end border border-dashed border-blue-600 rounded p-4">
        <div className="w-32 h-44 bg-blue-900 border border-blue-500 rounded mb-4 flex items-center justify-center shadow-lg shadow-blue-500/50">
          Votre Actif
        </div>
        <h2 className="text-blue-300">Vous (ID: {playerId})</h2>
        <div className="flex gap-2 mt-2">
          {/* Main (Hand) */}
          <div className="w-20 h-28 bg-gray-600 rounded border border-gray-500"></div>
          <div className="w-20 h-28 bg-gray-600 rounded border border-gray-500"></div>
          <div className="w-20 h-28 bg-gray-600 rounded border border-gray-500"></div>
        </div>
      </div>
    </div>
  );
}
