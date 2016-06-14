'use strict';

const sinon = require('sinon'),
  expect = require('chai').expect,
  dirname = __dirname.split('/').pop(),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  log = require('../../services/log').asInternal(__filename);

describe(dirname + '/' + filename, function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isStartComplete', function () {
    const fn = lib[this.title];

    it('is true', function () {
      expect(fn({status: 'complete', id: 'startup-complete'})).to.equal(true);
    });
  });

  describe('isRequestToOutputLink', function () {
    const fn = lib[this.title];

    it('is true when request exists', function () {
      const client = {requestMap: {abc: {}}},
        response = {source: 'link', id: 'abc', result: 'some result'};

      expect(fn(client, response)).to.equal(true);
    });

    it('is false when request does not exist', function () {
      const client = {requestMap: {}};

      expect(fn(client, {source: 'link', id: 'abc'})).to.equal(false);
    });
  });

  describe('isExecutionResult', function () {
    const fn = lib[this.title];

    it('is true', function () {
      const outputMap = {abc: {}},
        response = {
          result: {
            parent_header: {
              msg_id: 'abc'
            },
            msg_type: 'some_reply'
          }
        };

      expect(fn(outputMap, response)).to.equal(true);
    });
  });

  describe('isEvalResult', function () {
    const fn = lib[this.title];

    it('is true', function () {
      expect(fn({source: 'eval', id: 'some string id'})).to.equal(true);
    });
  });

  describe('isInputRequestMessage', function () {
    const fn = lib[this.title];

    it('is true', function () {
      const outputMap = {abc: {}},
        response = {
          source: 'stdin',
          result: {
            parent_header: {
              msg_id: 'abc'
            },
            msg_type: 'input_request'
          }
        };

      expect(fn(outputMap, response)).to.equal(true);
    });
  });

  describe('isExecutedRequestResolution', function () {
    const fn = lib[this.title];

    it('is true when successEvent is string', function () {
      log('info', 'HEY start');

      const outputMap = {abc: {id: 'ghi'}},
        client = {requestMap: { ghi: {successEvent: 'def_reply'}}},
        response = {
          result: {
            parent_header: {
              msg_id: 'abc'
            },
            msg_type: 'def_reply'
          }
        };

      expect(fn(outputMap, client, response)).to.equal(true);

      log('info', 'HEY end');
    });

    it('is true when successEvent is Array', function () {
      const outputMap = {abc: {}},
        request = {successEvent: ['def']},
        response = {
          result: {
            parent_header: {
              msg_id: 'abc'
            },
            msg_type: 'def'
          }
        };

      expect(fn(outputMap, request, response)).to.equal(true);
    });
  });
});
