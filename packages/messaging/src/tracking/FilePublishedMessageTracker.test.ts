import 'jest';

import fs from 'async-file';
import path from 'path';

import FilePublishedMessageTracker from './FilePublishedMessageTracker';

const TEST_FILEPATH = 'test/publishedMessages.log';

describe('FilePublishedMessageTracker', () => {
  const trackerName = 'defaultMessageTracker';

  const filepath = TEST_FILEPATH;
  let tracker: FilePublishedMessageTracker;

  beforeEach(async () => {
    const folder = path.dirname(filepath);

    if (!(await fs.exists(folder))) {
      await fs.createDirectory(folder);
    }

    try {
      await fs.truncate(filepath);
    } catch (err) {
      if (!err.message.includes('ENOENT')) {
        throw err;
      }
    }

    tracker = new FilePublishedMessageTracker({
      filepath,
      name: trackerName
    });
  });

  it('`getLastPulishedMessageId` should return 0 if no message has been published', async () => {
    const lastMessageId = await tracker.getLastPublishedMessageId();
    expect(lastMessageId).toBe(0);
  });

  describe('retrieval', () => {
    const messageId = 1234;

    beforeEach(async () => {
      // Save messageId to tracker
      await tracker.updateLastPublishedMessageId(messageId);
    });

    it('should retrieve a previously stored value', async () => {
      const retrievedValue = await tracker.getLastPublishedMessageId();

      expect(retrievedValue).toBe(messageId);
    });

    it('should ignore other trackers saved in the same file', async () => {
      const secondTracker = new FilePublishedMessageTracker({
        filepath,
        name: 'secondMessageTracker'
      });
      await secondTracker.updateLastPublishedMessageId(456);

      const retrievedValue = await tracker.getLastPublishedMessageId();

      expect(retrievedValue).toBe(messageId);
    });

    it('should survive re-initialization', async () => {
      const secondInstance = new FilePublishedMessageTracker({
        filepath,
        name: trackerName
      });

      const retrievedValue = await secondInstance.getLastPublishedMessageId();

      expect(retrievedValue).toBe(messageId);
    });
  });
});
