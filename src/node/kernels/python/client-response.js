'use strict';

const _ = require('lodash'),
  messageTypes = require('./message-types'),
  rules = require('../../services/rules');
let ruleSet,
  outputMap = {};

/**
 *
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 */
function linkRequestToOutput(client, response) {
  const requestMap = client.requestMap;

  if (!_.isString(response.result)) {
    throw new Error('Expected result to be msg_id of a later response');
  }

  if (!_.isString(response.id)) {
    throw new Error('Expected id to be a key referring to an earlier request');
  }

  requestMap[response.id].msg_id = response.result;
  outputMap[response.result] = {id: response.id, msg_id: response.result};
}

/**
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 */
function resolveRequest(client, response) {
  const request = messageTypes.getRequestFromClientResponse(outputMap, client, response),
    content = _.get(response, 'result.content');

  // payload is deprecated, so don't even expose it
  // engine_info creates noise, don't return it
  // execution count is a bad idea, don't encourage it
  request.deferred.resolve(_.omit(content, 'payload', 'engine_info', 'execution_count'));

  // we're done reporting about this topic
  delete outputMap[request.msg_id];
}

/**
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 */
function resolveEvalResult(client, response) {
  const request = client.requestMap[response.id];

  // payload is deprecated, so don't even expose it
  request.deferred.resolve(response.result);
}

/**
 * Rules for handling results from python
 * @type Array
 */
ruleSet = [
  {
    when: (client, response) => messageTypes.isStartComplete(response),
    then: (client) => client.emit('ready')
  },
  {
    when: (client, response) => messageTypes.isRequestToOutputLink(client, response),
    then: (client, response) => linkRequestToOutput(client, response)
  },
  {
    when: (client, response) => messageTypes.isInputRequestMessage(outputMap, response),
    then: (client, response) => client.emit('input_request', response.result)
  },
  {
    when: (client, response) => messageTypes.isExecutedRequestResolution(outputMap, client, response),
    then: (client, response) => resolveRequest(client, response)
  },
  {
    when: (client, response) => !messageTypes.isExecutedHiddenRequest(outputMap, client, response),
    then: (client, response) => client.emit(response.source, response)
  },
  {
    when: (client, response) => messageTypes.isEvalResult(response),
    then: (client, response) => resolveEvalResult(client, response)
  },
  {
    when: (client, response) => response.result && response.source,
    then: (client, response) => client.emit(response.source, response)
  },
  {
    when: (client, response) => response.id && response.result === null,
    then: _.noop
  },
  {
    when: true,
    then: (client, response) => client.emit('error', new Error('Unknown data object: ' + require('util').inspect(response)))
  }
];

/**
 * @param {JupyterClient} client
 * @param {JupyterClientResponse} response
 */
function handle(client, response) {
  rules.first(ruleSet, client, response);
}

/**
 * @returns {object}
 */
function getOutputMap() {
  // outside people are not allowed to modify this
  return _.cloneDeep(outputMap);
}

function resetOutputMap() {
  outputMap = {};
}

module.exports.handle = handle;
module.exports.getOutputMap = getOutputMap;
module.exports.resetOutputMap = resetOutputMap;
