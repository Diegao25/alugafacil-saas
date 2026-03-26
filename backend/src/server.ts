import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import app from './app';
import { syncAllProperties } from './services/calendar.service';

const logFile = path.join(__dirname, '../debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
console.log = (...args) => {
  logStream.write(`[LOG] ${args.join(' ')}\n`);
  process.stdout.write(`${args.join(' ')}\n`);
};
console.error = (...args) => {
  logStream.write(`[ERR] ${args.join(' ')}\n`);
  process.stderr.write(`${args.join(' ')}\n`);
};

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);

  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    syncAllProperties().catch(err => console.error('[Cron] Erro na sincronização automática:', err));
  }, ONE_HOUR);

  setTimeout(() => {
    syncAllProperties().catch(err => console.error('[Cron] Erro na sincronização inicial:', err));
  }, 60 * 1000);
});
