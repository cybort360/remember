import 'dotenv/config';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    const { config } = await import('./utils/config');
    const { App } = await import('@slack/bolt');
    const { handleMention } = await import('./handlers/mention');
    const { handleHomeTab } = await import('./handlers/homeTab');
    const { handleRememberSearch, handleHurricaneBrief } =
      await import('./handlers/slashCommands');
    const { scheduleHurricaneBrief } = await import('./triggers/seasonalTrigger');

    const app = new App({
      token: config.slack.botToken,
      appToken: config.slack.appToken,
      socketMode: true,
    });

    app.event('app_mention', handleMention);
    app.event('app_home_opened', handleHomeTab);

    app.command('/remember-search', handleRememberSearch);
    app.command('/hurricane-brief', handleHurricaneBrief);

    app.error(async (error) => {
      logger.error('Unhandled Bolt error', { error });
    });

    scheduleHurricaneBrief(app.client);

    await app.start();
    logger.info('REMEMBER is running', {});
  } catch (error) {
    logger.error('Failed to start REMEMBER', { error });
    process.exit(1);
  }
}

void main();
