/**
 * Watch options
 */
export interface WatchOptions {
  /**
   * Indicates whether the process should continue to run as long as files are being watched.
   * If set to false, the process will continue running even if the watcher is closed.
   */
  persistent?: boolean;

  /**
   * Indicates whether to watch files that don't have read permissions.
   */
  ignorePermissionErrors?: boolean;

  /**
   * A function that takes one parameter (the path of the file/directory)
   * and returns true to ignore or false to watch.
   */
  ignored?: string | RegExp | ((path: string) => boolean);

  /**
   * If set to false, only the parent directory will be watched for new files.
   */
  ignoreInitial?: boolean;

  /**
   * If set to true, symlinks will be followed.
   */
  followSymlinks?: boolean;

  /**
   * Interval of file system polling (in milliseconds).
   */
  interval?: number;

  /**
   * Interval of file system polling for binary files (in milliseconds).
   */
  binaryInterval?: number;

  /**
   * If set to true, will provide fs.Stats object as second argument
   * in add, addDir, and change events.
   */
  alwaysStat?: boolean;

  /**
   * If set, limits how many levels of subdirectories will be traversed.
   */
  depth?: number;

  /**
   * By default, add event fires when a file first appears on disk.
   * Setting this will wait for the write to finish before firing.
   */
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };

  /**
   * If set to true, will use fs.watchFile() (polling) instead of fs.watch().
   */
  usePolling?: boolean;

  /**
   * Whether to use fsevents watching on macOS (if available).
   */
  useFsEvents?: boolean;

  /**
   * The base path to watch.
   */
  cwd?: string;

  /**
   * Whether to disable globbing.
   */
  disableGlobbing?: boolean;

  /**
   * Automatically filter out artifacts that occur when using editors.
   */
  atomic?: boolean | number;
}