import uuid from 'uuid';
import {
  IAggregateCommand,
  IAggregateRoot,
  IApplicationCommand,
  IApplicationService,
  IRepository,
  IRepositoryFactory,
  IServiceRegistry
} from './interfaces';

abstract class ApplicationService implements IApplicationService {
  public abstract aggregates: { [s: string]: IAggregateRoot<any> };

  protected _serviceRegistry: IServiceRegistry;
  protected _repositories: {
    [s: string]: IRepository<any>;
  };

  constructor({
    serviceRegistry,
    repositoryFactory
  }: {
    serviceRegistry: IServiceRegistry;
    repositoryFactory: IRepositoryFactory;
  }) {
    this._serviceRegistry = serviceRegistry;
    this._repositories = this._configureRepositories(repositoryFactory);
  }

  public async start() {
    // Do any pre-launch setup here
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
    const repository = this._repositories[name];

    // Load the current state of the entity by replaying events
    const entity = await repository.getById(id);

    // Retrieve the aggregate root class & apply the command to the entity
    const aggregateRoot = this.aggregates[name];
    const events = await aggregateRoot.applyCommand(
      entity,
      command,
      this._serviceRegistry
    );

    // Save the events emitted from the aggregate instance to the repository
    await repository.save(id, events, version);

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

  /**
   * Create a repository instance for each aggregate
   * @param factory Repository factory
   * @returns Map of aggregate names to corresponding repository instances
   */
  private _configureRepositories(factory: IRepositoryFactory) {
    return Object.assign(
      {},
      ...Object.entries(this.aggregates).map(([name, root]) => ({
        [name]: factory.createRepository(root)
      }))
    );
  }
}

export default ApplicationService;
