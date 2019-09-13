import debugModule from 'debug';
import uuid from 'uuid';

import {
  IAggregateCommand,
  IAggregateRoot,
  IApplicationCommand,
  IServiceRegistry
} from '@eskit/core';
import { IRepository, IRepositoryFactory } from '@eskit/repository';

import { IApplicationService } from './interfaces';

const debug = debugModule('eskit:ApplicationService');

abstract class ApplicationService implements IApplicationService {
  protected abstract aggregates: { [s: string]: IAggregateRoot<any> } = {};
  protected serviceRegistry: IServiceRegistry;

  protected repositories?: {
    [s: string]: IRepository<any>;
  };

  private _repositoryFactory: IRepositoryFactory;

  constructor({
    serviceRegistry,
    repositoryFactory
  }: {
    serviceRegistry: IServiceRegistry;
    repositoryFactory: IRepositoryFactory;
  }) {
    debug('Initialise ApplicationService');
    this.serviceRegistry = serviceRegistry;
    this._repositoryFactory = repositoryFactory;

    this.start.bind(this);
    this.applyCommand.bind(this);
    this._configureRepositories.bind(this);
  }

  public async start() {
    debug(`${this.constructor.name}: Start ApplicationService`);
    // Do any additional pre-launch setup here
    this._configureRepositories();
  }

  /**
   * Apply a command to one of the aggregates managed by this application service
   * @param command Command data
   * @returns { id: string } Result with the id of the affected aggregate
   */
  public async applyCommand(
    command: IApplicationCommand | IAggregateCommand
  ): Promise<{ id: string }> {
    const aggregateCommand = this._convertToAggregateCommand(command);

    const {
      aggregate: { name: name, ...aggregate },
      version
    } = aggregateCommand;

    // Generate a new aggregate ID if one is not supplied
    const id = aggregate.id || uuid.v4();

    // Retrieve the repository using the aggregate name
    const repository = this.repositories![name];

    // Load the current state of the entity by replaying events
    const entity = await repository.getById(id);

    // Retrieve the aggregate root class & apply the command to the entity
    const aggregateRoot = this.aggregates[name];
    const events = await aggregateRoot.applyCommand(
      entity,
      command,
      this.serviceRegistry
    );

    const metadata = this._generateMetadata(aggregateCommand);

    if (events.length) {
      // Save the events emitted from the aggregate instance to the repository
      await repository.save(id, events, version, metadata);
    } else {
      debug(
        `Aggregate command ${name}.${command.name} didn't produce any events`
      );
    }

    // Return the aggregate id (since it may have been newly generated)
    return { id };
  }

  protected _convertToAggregateCommand = ({
    aggregate: { name, id },
    ...command
  }: IApplicationCommand | IAggregateCommand): IAggregateCommand => ({
    ...command,
    aggregate: {
      name,
      id: id || uuid.v4()
    }
  });

  protected _generateMetadata = (command: IAggregateCommand) => ({
    userId: command.userId
  });

  /**
   * Create a repository instance for each aggregate
   * @param factory Repository factory
   * @returns Map of aggregate names to corresponding repository instances
   */
  private _configureRepositories() {
    debug(
      `${this.constructor.name}: Configure repositories for aggregates: ${[
        ...Object.keys(this.aggregates)
      ]}`
    );
    this.repositories = Object.assign(
      {},
      ...Object.entries(this.aggregates).map(([name, root]) => ({
        [name]: this._repositoryFactory.createRepository(root)
      }))
    );
  }
}

export default ApplicationService;
