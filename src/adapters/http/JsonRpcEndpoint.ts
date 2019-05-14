import debugModule from 'debug';
import { DomainError } from '../../errors';
import { IApplicationCommand, IEnvelope } from '../../interfaces';
import {
  ErrorCodeGetter,
  IErrorCodeMap,
  IJsonRpcAggregateCommand,
  IJsonRpcEndpointConstructor,
  IJsonRpcError,
  IJsonRpcErrorResponse,
  IJsonRpcResponse,
  IJsonRpcResultResponse
} from './interfaces';

const debug = debugModule('eskit:adapters:http:JsonRpcEndpoint');

const createErrorCodeGetter = (
  errorCodes: IErrorCodeMap | ErrorCodeGetter
): ErrorCodeGetter => (e: Error) => {
  if (errorCodes instanceof Function) {
    return errorCodes(e);
  }
  return errorCodes[e.constructor.name] || errorCodes.DEFAULT;
};

const getDefaultHttpStatus = (e: IJsonRpcError): number => {
  return e instanceof DomainError ? 400 : 500;
};

export const createJsonRpcEndpoint: IJsonRpcEndpointConstructor = ({
  service,
  errorCodes,
  getHttpStatus,
  getUserIdFromRequest
}) => async (req, res) => {
  const {
    id, // Command id
    method, // Command name
    params: { aggregate, version, data } // Command parameters
  } = req.body as IJsonRpcAggregateCommand;

  debug(
    `Received command ${id}: ${method}: ${aggregate}@${version} - ${JSON.stringify(
      data
    )}`
  );

  debug(`Request local variables: ${JSON.stringify(res.locals)}`);

  // Parsed from JWT in authentication middleware
  const userId =
    getUserIdFromRequest &&
    (await Promise.resolve(getUserIdFromRequest(req, res)));

  debug(`User id from request: ${userId}`);

  // JSON-RPC method name is a dot-delimited combination of aggregate & command names
  const [aggregateName, commandName] = method.split('.');

  // Construct the message envelope
  const envelope: IEnvelope<IApplicationCommand> = {
    id,
    metadata: {
      causationId: id,
      correlationId: id
    },
    payload: {
      data,
      userId,
      version,
      aggregate: {
        id: aggregate,
        name: aggregateName
      },
      name: commandName
    }
  };

  debug(`Command envelope: ${JSON.stringify(envelope)}`);

  const response: Partial<IJsonRpcResponse> = { id, jsonrpc: '2.0' };

  const getJsonRpcErrorCode = createErrorCodeGetter(errorCodes);

  try {
    const result = await service.applyCommand(envelope.payload);
    res.status(200);
    (response as IJsonRpcResultResponse).result = result;
    return res.json(response);
  } catch (e) {
    const errorName = e.constructor.name;

    const err: IJsonRpcError = {
      code: getJsonRpcErrorCode(e),
      data: e.message,
      message: errorName
    };
    (response as IJsonRpcErrorResponse).error = err;

    const getStatusCode = getHttpStatus || getDefaultHttpStatus;

    return res.status(getStatusCode(err)).json(response);
  }
};
