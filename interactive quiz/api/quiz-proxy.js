// Simple Vercel serverless function to proxy requests to quizapi.io
// Save your QUIZAPI_KEY in Vercel project environment variables as QUIZAPI_KEY

module.exports = async (req, res) => {
  const targetUrl = 'https://quizapi.io/api/v1/questions' + (req.url || '');
  const apiKey = process.env.QUIZAPI_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured: missing QUIZAPI_KEY' });
    return;
  }

  try {
    const fetchRes = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      }
    });
    const data = await fetchRes.text();
    res.status(fetchRes.status).setHeader('Content-Type', 'application/json').send(data);
  } catch (err) {
    res.status(502).json({ error: 'Proxy fetch failed', detail: err.message });
  }
};
