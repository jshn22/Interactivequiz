Local QuizAPI Proxy

This small proxy forwards requests from your browser to quizapi.io using a server-side API key. Use it during development to avoid exposing the API key in client code and to avoid client-side rate limiting.

Quick start

1. Copy `.env.example` to `.env` and set your API key:

   QUIZAPI_KEY=your_real_key_here

2. Install dependencies and start the proxy:

   npm install
   npm start

3. The proxy will be available at `http://localhost:4000/api/questions`. Your client app can call this URL with the same query parameters as quizapi.io, e.g.:

   http://localhost:4000/api/questions?limit=20&page=1&tags=JavaScript

Notes
- The proxy forwards the HTTP status from quizapi.io. If quizapi.io returns 429, the proxy will forward that response (the proxy doesn't change rate limits).
- Keep your `.env` out of version control.
# Local proxy (development)
To fetch real questions from quizapi.io without exposing your API key, run the included local proxy during development.

1. Install dependencies in your project root:

	npm init -y
	npm install express node-fetch@2

2. Create a `.env` file with your key:

	QUIZAPI_KEY=your_real_quizapi_key_here

3. Start the proxy:

	node local-proxy/server.js

4. Update `PROXY_URL` in `script.js` to point to the proxy, for example:

	const PROXY_URL = 'http://localhost:4000/api/questions?limit=20&tags=JavaScript';

This keeps the API key server-side while allowing the client to request real questions.

# JavaScript Fundamentals Quiz

A small interactive quiz built with HTML, CSS, and vanilla JavaScript (ES6+).

Features
- Multiple choice questions covering JS fundamentals and ES6 topics
- One question at a time, per-question timer
- Shuffle questions and options
- Progress bar, selected highlight, correct/incorrect feedback
- Smooth transitions, restart option

How to run
1. Open `index.html` in your browser (no server needed).

Notes
- The app uses a 15-second timer per question. You can change `QUESTION_TIME` in `script.js`.
- Questions are stored in the `questions` array inside `script.js`.

Quick test
- Open `index.html` in a modern browser. Answer a few questions or let the timer expire to verify correct/wrong feedback, progress bar updates, and final score. Use the "Restart" or "Play Again" button to retry.
