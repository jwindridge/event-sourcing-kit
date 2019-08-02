import 'jest';

jest.mock('amqplib');
import amqp from 'amqplib';

import { connect, establishChannel } from './util';

describe('connect', () => {
  const dummyUrl: string = 'amqp://locahost:5672/dummy-vhost';

  it('Should attempt a connection to the URL provided', async () => {
    (amqp.connect as any).mockResolvedValue({});

    const conn = await connect(dummyUrl);

    expect(amqp.connect).toHaveBeenCalledWith(dummyUrl);
    expect(conn).not.toBeUndefined();
  });

  it('Should wrap errors thrown during connection process', async () => {
    const undlError = new Error('UnderlyingError');

    (amqp.connect as any).mockRejectedValue(undlError);

    await expect(connect(dummyUrl)).rejects.toThrowError({
      message: 'Unable to establish connection to AMQP exchange',
      name: 'Error',
      stack: `\nCausedBy:\n${undlError.stack}`
    });
  });
});

describe('establishChannel', () => {
  const exchangeName = 'amqp-exchange-name';

  let mockConnection: Partial<amqp.Connection>;
  let mockChannel: Partial<amqp.Channel>;

  beforeEach(() => {
    mockChannel = {
      assertExchange: jest.fn()
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel)
    };
  });

  test.each`
    durable
    ${true}
    ${false}
  `('Should create a channel (durable = $durable)', async ({ durable }) => {
    const channel = await establishChannel({
      durable,
      exchangeName,
      connection: mockConnection as any
    });
    // Should call `createChannel` from the underlying library
    expect(mockConnection.createChannel).toHaveBeenCalledWith();

    // Should assert that the exchange exists
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      exchangeName,
      'topic',
      { durable }
    );

    // Should return the channel object
    expect(channel).toBe(mockChannel);
  });
});
