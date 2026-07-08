import { runWapkCommand } from './command';

const args = process.argv.slice(2);

runWapkCommand(args).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
