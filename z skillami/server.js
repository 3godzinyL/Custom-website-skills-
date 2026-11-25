import { createApp } from './src/app.js';

const app = createApp();
const addr = await app.listen();
app.log.info(`Ogarnij działa: http://${addr.address}:${addr.port}  (panel: /admin, maile: ${app.config.mail.transport}, płatności: ${app.config.payments.provider})`);

process.on('unhandledRejection', (e) => app.log.error('unhandledRejection', e));
process.on('uncaughtException', (e) => app.log.error('uncaughtException', e));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await app.close(); process.exit(0); });
