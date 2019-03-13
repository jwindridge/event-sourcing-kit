import { IApplicationEvent } from '../../application';

export interface IEventDispatcher {
  dispatch(event: IApplicationEvent): Promise<void>;
}
