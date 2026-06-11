import { Bindings } from "./types";

interface Session {
  webSocket: WebSocket;
  blocked: boolean;
  quit: boolean;
}

export class ConnectionManager {
  state: DurableObjectState;
  sessions: Session[] = [];
  env: Bindings;

  constructor(state: DurableObjectState, env: Bindings) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/ws')) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const pair = new WebSocketPair();
      await this.handleSession(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else if (url.pathname.endsWith('/broadcast')) {
      const payload = await request.text();
      this.broadcast(payload);
      return new Response(null, { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }

  async handleSession(webSocket: WebSocket) {
    webSocket.accept();

    const session: Session = {
      webSocket,
      blocked: false,
      quit: false,
    };
    this.sessions.push(session);

    webSocket.addEventListener("message", async (msg) => {
      try {
        if (session.quit) {
          webSocket.close(1011, "WebSocket broken.");
          return;
        }
        // For now, we don't need to handle incoming messages from client,
        // but this is where you would put that logic.
        // e.g., JSON.parse(msg.data)
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
        webSocket.send(JSON.stringify({ error: "Internal server error" }));
      }
    });

    webSocket.addEventListener("close", () => this.handleQuit(session));
    webSocket.addEventListener("error", () => this.handleQuit(session));
  }

  handleQuit(session: Session) {
    session.quit = true;
    this.sessions = this.sessions.filter(s => s !== session);
  }

  broadcast(message: string | object) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.sessions = this.sessions.filter(session => {
      if (session.quit) return false;
      try {
        session.webSocket.send(payload);
        return true;
      } catch (err) {
        session.quit = true;
        return false;
      }
    });
  }
}
