# Who Is Lying?

Real-time multiplayer for exactly 5 human players per room. Node.js + Express + Socket.IO. The server owns roles, clues, votes, timers and scores; each client only receives its own role and clue.

## Run locally
```
npm install
npm start
```
Open http://localhost:3000. For phones on the same Wi-Fi, use `http://<your-computer-LAN-IP>:3000`.

## Deploy so friends can join from anywhere
Any host that runs Node and supports WebSockets works (Render, Railway, Fly.io).

**Render (free tier):**
1. Push this folder to a GitHub repo.
2. Render → New → Web Service → pick the repo.
3. Build command `npm install`, start command `npm start`.
4. Share the `https://...onrender.com` URL. One person creates a room and shares the 6-character code.

The server reads the `PORT` environment variable automatically.

## Game rules as built
- Host creates a room; 5 players join with the code. Start is blocked until 5 are connected.
- 3-minute chat discussion, then a 45s hidden vote. Votes reveal when all have voted or time runs out.
- Most votes on the liar: investigators win. Otherwise the liar wins.
- Tie: 45s second discussion and a re-vote between the tied players. A second tie is a liar win.
- Points: winners +100, voting for the liar +100, a surviving liar +150 extra.
- A disconnected player has 60s to reconnect (the page rejoins automatically); after that the round is cancelled and the room returns to the lobby.

## Not included yet
Persistent profiles/leaderboard (scores live in the room), voice chat, a bot-replacement option, and cases 9 to 20 (add objects to `cases.js` in the same shape).
