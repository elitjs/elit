import { SMTPServer } from 'smtp-server';

export function closeSmtpServer(server: SMTPServer): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    const handleCloseError = (error: Error) => {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode === 'ERR_SERVER_NOT_RUNNING') {
        finish();
        return;
      }

      finish(error);
    };

    try {
      server.close(() => finish());
    } catch (error) {
      handleCloseError(error as Error);
    }
  });
}