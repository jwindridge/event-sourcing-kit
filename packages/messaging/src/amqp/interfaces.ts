export interface IAMQPExchangeOpts {
  // Name of the exchange
  name: string;

  // Should the exchange & contents be retained between restarts
  durable?: boolean;
}
