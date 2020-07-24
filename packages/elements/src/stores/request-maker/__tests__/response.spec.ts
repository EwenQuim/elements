import { IPrismDiagnostic } from '@stoplight/prism-core';

import { stringToArrayBuffer } from '../../../utils/arrayBuffer';
import { ResponseStore } from '../response';

describe('ResponseStore', () => {
  describe('createEmpty', () => {
    it('should create an empty store', () => {
      const store = ResponseStore.createEmpty();
      expect(store.raw).toEqual(new ArrayBuffer(0));
      expect(store.statusCode).toEqual(0);
      expect(store.headers).toEqual({});
      expect(store.error).toBeUndefined();
      expect(store.isMockedResponse).toStrictEqual(false);
      expect(store.responseTime).toEqual(0);
      expect(store.originalRequest).toBeUndefined();
    });
  });

  describe('fromNetworkResponse', () => {
    describe('success', () => {
      const bodyText = '{"test": "json"}';
      const sampleResponse = {
        status: 201,
        headers: {
          'X-Custom-Header': 'CustomValue',
        },
        data: stringToArrayBuffer(bodyText),
      };

      let store: ResponseStore;

      beforeEach(() => {
        store = ResponseStore.fromNetworkResponse(sampleResponse);
      });

      it('should have correct status code', () => {
        expect(store.statusCode).toEqual(sampleResponse.status);
      });

      it('should have custom header', () => {
        expect(store.headers).toEqual(sampleResponse.headers);
      });

      it('should have no error', () => {
        expect(store.error).toBeUndefined();
      });

      it('should have raw body', () => {
        expect(store.raw).toEqual(sampleResponse.data);
      });

      it('should have status text calculated', () => {
        expect(store.statusText).toBe('201 Created');
      });

      it('should have body decoded', () => {
        expect(store.body).toBe(bodyText);
      });

      it('should have body JSON parsed', () => {
        expect(store.bodyJson).toEqual({ test: 'json' });
      });
    });

    describe('http error code', () => {
      const sampleResponse = {
        status: 401,
        headers: {},
      };

      let store: ResponseStore;

      beforeEach(() => {
        store = ResponseStore.fromNetworkResponse(sampleResponse);
      });

      it('should have status text calculated', () => {
        expect(store.statusText).toBe('401 Unauthorized');
      });
    });

    describe('violations', () => {
      const violation: IPrismDiagnostic = {
        message: 'Hello',
        severity: 0,
      };

      const sampleResponse = {
        status: 401,
        headers: {
          'sl-violations': JSON.stringify([violation]),
        },
      };

      let store: ResponseStore;

      beforeEach(() => {
        store = ResponseStore.fromNetworkResponse(sampleResponse);
      });

      it('should have the violation property filled', () => {
        expect(store.violations).toHaveLength(1);
      });
    });
  });

  describe('fromAxiosError', () => {
    it('should handle axios cancelation', () => {
      const cancelation = {
        name: 'Cancelation',
        message: 'Cancelation',
        __CANCEL__: true,
        isAxiosError: true,
        config: {},
        toJSON: () => ({}),
      };
      const store = ResponseStore.fromAxiosError(cancelation);

      expect(store.statusCode).toBe(0);
      expect(store.statusText).toBe('Canceled');
      expect(store.error).toBeUndefined();
    });

    it('should handle axios error', () => {
      const message = 'some error msg';
      const axiosError = {
        message,
        isAxiosError: true,
        config: {},
        toJSON: () => ({}),
        name: '',
      };

      const store = ResponseStore.fromAxiosError(axiosError);
      expect(store.statusCode).toBe(0);
      expect(store.statusText).toBe('Error');

      const storeError = store.error;
      expect(storeError).toBeDefined();
      expect(storeError && storeError.message).toMatch(message);
    });
  });

  describe('fromMockObjectResponse', () => {
    const mockResponseData = {
      test: 'json',
    };
    const sampleResponse = {
      status: 201,
      headers: {
        'X-Custom-Header': 'CustomValue',
      },
      data: mockResponseData,
      violations: [],
    };

    let store: ResponseStore;

    beforeEach(() => {
      store = ResponseStore.fromMockObjectResponse(sampleResponse);
    });

    it('should have correct status code', () => {
      expect(store.statusCode).toEqual(sampleResponse.status);
    });

    it('should have custom header', () => {
      expect(store.headers).toEqual(sampleResponse.headers);
    });

    it('should have no error', () => {
      expect(store.error).toBeUndefined();
    });

    it('should have status text calculated', () => {
      expect(store.statusText).toBe('201 Created');
    });

    it('should have body text encoded', () => {
      expect(store.body).toBe(JSON.stringify(mockResponseData));
    });

    it('bodyJson should match input', () => {
      expect(store.bodyJson).toEqual(mockResponseData);
    });

    it('should handle empty responses', () => {
      const emptyResponse = {
        status: 201,
        headers: {
          'X-Custom-Header': 'CustomValue',
        },
        data: undefined,
        violations: [],
      };

      const emptyStore = ResponseStore.fromMockObjectResponse(emptyResponse);
      expect(emptyStore.body).toBe('');
      expect(emptyStore.bodyJson).toBe('');
      expect(emptyStore.error).toBeUndefined();
    });
  });

  describe('fromError', () => {
    it('should store prism error', () => {
      const message = 'some error msg';
      const error = new Error(message);

      const store = ResponseStore.fromError(error);

      expect(store.error).toBe(error);
      expect(store.statusCode).toBe(0);
      expect(store.statusText).toBe('Error');
    });
  });

  describe('responseType', () => {
    it('should recognize content-type header', () => {
      const store = ResponseStore.fromNetworkResponse({
        headers: {
          'Content-Type': 'text/plain',
        },
        data: stringToArrayBuffer('{"looks": "like-json"}'),
        status: 200,
      });

      expect(store.responseType).toBe('text');
    });

    it('should recognize JSON if no content-type header', () => {
      const store = ResponseStore.fromNetworkResponse({
        headers: {},
        data: stringToArrayBuffer('{"looks": "like-json"}'),
        status: 200,
      });

      expect(store.responseType).toBe('json');
    });

    it('should not recognize invalid JSON if no content-type header', () => {
      const store = ResponseStore.fromNetworkResponse({
        headers: {},
        data: stringToArrayBuffer('{garbage}'),
        status: 200,
      });

      expect(store.responseType).toBe('');
    });
  });
});