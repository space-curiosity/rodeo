'use strict';

const _ = require('lodash'),
  log = require('../../services/log').asInternal(__filename);

/**
 * @param {{status: string, id: string}} obj
 * @returns {boolean}
 */
function isStartComplete(obj) {
  return _.isObject(obj) && obj.status === 'complete' && obj.id === 'startup-complete';
}

/**
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 * @returns {boolean}
 */
function isRequestToOutputLink(client, response) {
  const requestMap = client.requestMap,
    result = response.result,
    source = response.source;

  return !!(source === 'link' && response.id && result && requestMap[response.id]);
}

/**
 * @param {object} outputMap
 * @param {JupyterClientResponse} response
 * @returns {boolean}
 */
function isExecutionResult(outputMap, response) {
  const parentMessageId = _.get(response, 'result.parent_header.msg_id'),
    messageType = _.get(response, 'result.msg_type'),
    isReply = messageType && _.endsWith(messageType, '_reply');

  log('info', 'isExecutionResult');

  if (!isReply) {
    log('warn', 'not reply');
    return false;
  }

  if (_.size(outputMap) === 0) {
    log('warn', messageType, 'without anyone waiting for output', outputMap, response);
    return false;
  }

  if (!outputMap[parentMessageId]) {
    log('warn', messageType, 'without parent waiting for output', outputMap, response);
    return false;
  }

  return true;
}

/**
 * @param {JupyterClientResponse} response
 * @returns {boolean}
 */
function isEvalResult(response) {
  const isEvalSource = response && response.source === 'eval',
    hasStringId = response && _.isString(response.id);

  return isEvalSource && hasStringId;
}

/**
 * @param {object} outputMap
 * @param {JupyterClientResponse} response
 * @returns {boolean}
 */
function isInputRequestMessage(outputMap, response) {
  const source = response.source,
    result = response.result;

  return source === 'stdin' && result.msg_type === 'input_request';
}

/**
 * @param {object} outputMap
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} [response]
 * @returns {boolean}
 */
function isExecutedRequestResolution(outputMap, client, response) {
  if (isExecutionResult(outputMap, response)) {
    const request = getRequestFromClientResponse(outputMap, client, response),
      msgType = _.get(response, 'result.msg_type');

    if (request) {
      if (_.isArray(request.successEvent) && _.includes(request.successEvent, msgType)) {
        return true;
      } else if (request.successEvent === msgType) {
        return true;
      }
    }
  }

  return false;
}

/**
 * @param {object} outputMap
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 * @return {boolean}
 */
function isExecutedHiddenRequest(outputMap, client, response) {
  const request = getRequestFromClientResponse(outputMap, client, response);

  return request.hidden;
}

/**
 * @param {object} outputMap
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 * @return {object}
 */
function getRequestFromClientResponse(outputMap, client, response) {
  const outputMapId = _.get(response, 'result.parent_header.msg_id');

  // assertions
  if (!outputMapId) {
    throw new Error('getRequestFromClientResponse response parameter is missing parent_header.msg_id');
  } else if (!outputMap[outputMapId]) {
    throw new Error('getRequestFromClientResponse outputMap does not contain outputMapId');
  }

  return client.requestMap[outputMap[outputMapId].id];
}

module.exports.isStartComplete = isStartComplete;
module.exports.isRequestToOutputLink = isRequestToOutputLink;
module.exports.isExecutionResult = isExecutionResult;
module.exports.isEvalResult = isEvalResult;
module.exports.isInputRequestMessage = isInputRequestMessage;
module.exports.isExecutedRequestResolution = isExecutedRequestResolution;
module.exports.isExecutedHiddenRequest = isExecutedHiddenRequest;
module.exports.getRequestFromClientResponse = getRequestFromClientResponse;
