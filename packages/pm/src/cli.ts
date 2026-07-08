import { runPmCommand } from './commands';

const args = process.argv.slice(2);

runPmCommand(args).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
