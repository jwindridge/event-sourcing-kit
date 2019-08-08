export interface IPublishedMessageTrackerOpts {
  /**
   * Unique name for this tracker
   * This allows for publishing of messages to separate channels to be tracked
   * separately
   */
  name: string;
}

/**
 * Interface for persisting record of which events have already been published
 */
export interface IPublishedMessageTracker {
  /**
   * Retrieve the id of the most recently published message
   * @returns last published message id
   */
  getLastPublishedMessageId(): Promise<number>;

  /**
   * Update the records of which event was last published
   * @param messageId Identifier of the most recently published message
   */
  updateLastPublishedMessageId(messageId: number): Promise<void>;
}
