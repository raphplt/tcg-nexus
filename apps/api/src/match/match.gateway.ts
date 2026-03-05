import { Injectable } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PlayerAction } from "./engine/actions/Action";
import { GameEngine } from "./engine/GameEngine";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/match",
})
@Injectable()
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory store of active engine instances mapped by matchId
  private activeMatches: Map<string, GameEngine> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Logic to handle reconnects or forfeit if they don't return
  }

  @SubscribeMessage("join_match")
  handleJoinMatch(
    @MessageBody() data: { matchId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.matchId);

    // Create an engine if it doesn't exist yet (in a real app, initialize from DB state)
    if (!this.activeMatches.has(data.matchId)) {
      // this.activeMatches.set(data.matchId, new GameEngine(initialState));
    }

    this.server
      .to(data.matchId)
      .emit("player_joined", { playerId: data.playerId });
    return { status: "joined", matchId: data.matchId };
  }

  @SubscribeMessage("dispatch_action")
  handleDispatchAction(
    @MessageBody() data: { matchId: string; action: PlayerAction },
    @ConnectedSocket() client: Socket,
  ) {
    const engine = this.activeMatches.get(data.matchId);
    if (!engine) {
      return { error: "Match not found" };
    }

    try {
      const events = engine.dispatch(data.action);
      const newState = engine.getState();

      // Broadcast events and state updates to all clients in the room
      // Important: We should sanitize the state to hide opponent's hand/deck
      this.server.to(data.matchId).emit("game_events", events);
      this.server.to(data.matchId).emit("state_update", newState); // TODO: sanitize

      return { status: "success" };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
