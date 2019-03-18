import { AMQPRPCServer } from '@elastic.io/amqp-rpc';
import { connect } from 'amqplib';
import { injectable } from 'inversify';
import {
  IAggregateCommandService,
  IApplicationCommand
} from '../../../application';
import { ICommandAdapter } from '../../interfaces';

interface IRpcCommandAdapterParams {
  url: string;
}

@injectable()
class RpcCommandAdapter<T> implements ICommandAdapter {
  private _url: string;
  private _service?: IAggregateCommandService<any>;
  private _rpcServer?: AMQPRPCServer;

  constructor(
    config: IRpcCommandAdapterParams,
    service: IAggregateCommandService<T>
  ) {
    this._url = config.url;
    this._service = service;
  }

  public async start(): Promise<void> {
    const connection = await connect(this._url);

    const service = this._service!;

    const queueName = service!.aggregate.name;

    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    this._rpcServer = new AMQPRPCServer(connection, {
      requestsQueue: queueName
    });
    for (const command of service.aggregate.commands) {
      this._rpcServer.addCommand(command, (...args: any[]) => {
        const [id, version, data, commandId, user] = args;

        const reject = (reason: string) => {
          throw new Error(reason);
        };

        const applicationCommand: IApplicationCommand = {
          data,
          reject,
          user,
          version,
          aggregate: {
            id,
            name: service.aggregate.name
          },
          id: commandId,
          name: command
        };

        return this._service!.handle(applicationCommand);
      });
    }

    this._rpcServer.start();
  }
}

export default RpcCommandAdapter;
