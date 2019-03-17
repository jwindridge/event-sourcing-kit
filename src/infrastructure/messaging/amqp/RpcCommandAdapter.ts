import { AMQPRPCServer, Command } from '@elastic.io/amqp-rpc';
import { connect } from 'amqplib';
import { injectable } from 'inversify';
import {
  IApplicationCommand,
  IAggregateCommandService
} from '../../../application';

interface IRpcCommandAdapterParams {
  url: string;
}

@injectable()
class RpcCommandAdapter<T> {
  private _url: string;
  private _service?: IAggregateCommandService<T>;
  private _rpcServer?: AMQPRPCServer;

  constructor(config: IRpcCommandAdapterParams) {
    this._url = config.url;
  }

  public bind(service: IAggregateCommandService<T>): void {
    this._service = service;
  }

  public async start() {
    const connection = await connect(this._url);

    const service = this._service!;

    const queueName = service!.aggregate.name;

    this._rpcServer = new AMQPRPCServer(connection, {
      requestsQueue: queueName
    });
    for (const command of service.aggregate.commands) {
      this._rpcServer.addCommand(command, (c: Command) => {
        const [commandData] = c.args;
        return service.handle(commandData as IApplicationCommand);
      });
    }
  }
}

export default RpcCommandAdapter;
