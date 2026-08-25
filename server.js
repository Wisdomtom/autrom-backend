// Autrom backend entrypoint
// Stack: Node.js + Express + PostgreSQL + node-cron
// Run: npm install && npm start   (requires a .env file — see .env.example)

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const { runPipelineForActiveUsers } = require('./lib/orchestrator');

const app = express();
app.use(cors())
app.use(express.json());

app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/logs', require('./routes/logs'));

app.get('/health', (req, res) => res.json({ ok: true }));

// Every 15 minutes, check which users are due for a run based on
// pipeline_settings.next_run_at. This is coarser than the chosen interval
// (2-12h) on purpose — a cron job checking every 15 min is enough resolution
// and far cheaper than one cron schedule per user.
cron.schedule('*/15 * * * *', () => {
  runPipelineForActiveUsers().catch(err => console.error('[scheduler] tick failed', err));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Autrom server listening on :${PORT}`));
