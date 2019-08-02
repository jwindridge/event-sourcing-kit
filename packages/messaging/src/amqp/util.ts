import amqp, { Options } from 'amqplib';
import debugModule from 'debug';

const debug = debugModule('eskit:messaging:amqp:util');

/**
 * Connect to the AMQP server
 */
export async function connect(
  url: string | Options.Connect
): Promise<amqp.Connection> {
  debug(`Attempt connection to AMQP exchange at ${url}`);
  let connection;
  try {
    connection = await amqp.connect(url);
  } catch (e) {
    const reason = new Error('Unable to establish connection to AMQP exchange');
    reason.stack += `\nCaused by:\n${e.stack}`;
    throw reason;
  }
  debug(`Established connection to AMQP exchange at ${url}`);

  return connection;
}

export async function establishChannel({
  connection,
  exchangeName,
  durable = true
}: {
  connection: amqp.Connection;
  exchangeName: string;
  durable?: boolean;
}) {
  const channel = await connection.createChannel();
  debug(
    `Assert exchange ${exchangeName} exists (${
      durable ? 'durable' : 'not durable'
    })`
  );
  await channel.assertExchange(exchangeName, 'topic', { durable });

  return channel;
}
