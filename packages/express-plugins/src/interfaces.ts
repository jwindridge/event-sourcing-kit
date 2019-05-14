import { Request, RequestHandler, Response } from 'express';

import { IApplicationService } from '@eskit/application';

/**
 * Map of error names to JSON RPC error codes
 */
export interface IErrorCodeMap {
  DEFAULT: number;
  [s: string]: number;
}

export type ErrorCodeGetter = (e: Error) => number;
export type StatusCodeGetter = (err: IJsonRpcError) => number;

export interface IJsonRpcAggregateCommand {
  id: string;
  jsonrpc: '2.0';
  method: string;
  params: {
    aggregate?: string;
    data?: object;
    version: number;
  };
}

export interface IJsonRpcResultResponse {
  id: string;
  jsonrpc: '2.0';
  result: any;
}

export interface IJsonRpcError {
  code: number;
  message: string;
  data?: object;
}

export interface IJsonRpcErrorResponse {
  id: string;
  jsonrpc: '2.0';
  error: IJsonRpcError;
}

export type IJsonRpcResponse = IJsonRpcResultResponse | IJsonRpcErrorResponse;

interface IRpcEndpointConstructorParams {
  service: IApplicationService;
  errorCodes: IErrorCodeMap | ErrorCodeGetter;
  getHttpStatus?: StatusCodeGetter;
  getUserIdFromRequest?: (req: Request, res: Response) => string;
}

export type IJsonRpcEndpointConstructor = (
  params: IRpcEndpointConstructorParams
) => RequestHandler;
