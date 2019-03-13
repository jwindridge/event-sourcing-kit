export interface IDomainService {
  [s: string]: (...args: any) => Promise<any>;
}

export interface IServiceRegistry {
  [s: string]: IDomainService;
}
