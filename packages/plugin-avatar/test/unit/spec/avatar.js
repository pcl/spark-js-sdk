/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */
import {assert} from '@ciscospark/test-helper-chai';
import Avatar from '../../';
import {SparkHttpError} from '@ciscospark/spark-core';
import User from '@ciscospark/plugin-user';
import MockSpark from '@ciscospark/test-helper-mock-spark';
import sinon from '@ciscospark/test-helper-sinon';


describe(`plugin-avatar`, () => {
  let avatar;
  let spark;

  beforeEach(() => {
    spark = new MockSpark({
      children: {
        avatar: Avatar,
        user: User
      }
    });
    avatar = spark.avatar;
    avatar.config.batcherWait = 1500;
    avatar.config.batcherMaxCalls = 100;
    avatar.config.batcherMaxWait = 100;
    avatar.config.cacheExpiration = 60 * 60;
    avatar.config.defaultAvatarSize = 80;
  });

  describe(`#retrieveAvatarUrl()`, () => {
    it(`requires a user identifying object`, () => {
      return Promise.all([
        assert.isRejected(avatar.retrieveAvatarUrl(), `\`user\` is a required parameter`)
      ]);
    });

    describe(`when retrieving a single item`, () => {
      it(`retrieves an avatar url @canary`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              80: {
                size: 80,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [80]
              }
            ]
          }
        }));
        const deferred = avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`);
        return assert.becomes(deferred, `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`);
      });

      it(`fails to retrieve an avatar url`, () => {
        spark.request = sinon.stub().returns(Promise.reject(new SparkHttpError.InternalServerError({
          body: ``,
          statusCode: 500,
          options: {
            method: `POST`,
            uri: `https://avatar.example.com`,
            headers: {
              trackingid: `tid`
            },
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [80]
              }
            ]
          }
        })));

        return assert.isRejected(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`));
      });

      it(`retrieves an avatar url for a non-default size`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              110: {
                size: 110,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [110]
              }
            ]
          }
        }));

        return assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 110}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`);
      });

      it(`retrieves an avatar url for a non-standard size`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              35: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [35]
              }
            ]
          }
        }));

        return assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 35}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`);
      });
    });

    describe(`when retrieving multiple items`, () => {
      it(`retrieves a group of avatar urls`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              80: {
                size: 80,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`
              }
            },
            '88888888-4444-4444-4444-aaaaaaaaaaa1': {
              80: {
                size: 80,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [80]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [80]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1`)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`rejects each requested avatar if the api call fails`, () => {
        spark.request = sinon.stub().returns(Promise.reject(new SparkHttpError.InternalServerError({
          body: ``,
          statusCode: 500,
          options: {
            method: `POST`,
            uri: `https://avatar.example.com`,
            headers: {
              trackingid: `tid`
            },
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [80]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [80]
              }
            ]
          }
        })));

        const a0 = avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`);
        const a1 = avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`);

        return Promise.all([
          assert.isRejected(a1),
          assert.isRejected(a0)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`rejects each avatar missing from the response`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              80: {
                size: 80,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [80]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [80]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0`),
          assert.isRejected(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`), /Failed to retrieve avatar/)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`retrieves avatar urls for homogenous, non-default sizes`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              40: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`
              }
            },
            '88888888-4444-4444-4444-aaaaaaaaaaa1': {
              40: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--40`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [40]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [40]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 40}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`, {size: 40}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--40`)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`retrieves avatar urls for heterogneous, non-default sizes`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              40: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`
              }
            },
            '88888888-4444-4444-4444-aaaaaaaaaaa1': {
              110: {
                size: 110,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [40]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [110]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 40}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`, {size: 110}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`retrieves avatar urls for multiple sizes for the same user`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              40: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`
              }
            },
            '88888888-4444-4444-4444-aaaaaaaaaaa1': {
              40: {
                size: 40,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--40`
              },
              110: {
                size: 110,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [40]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [40, 110]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 40}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--40`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`, {size: 40}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--40`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`, {size: 110}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });

      it(`retrieves avatar urls for homogenous, non-standard sizes`, () => {
        spark.request = sinon.stub().returns(Promise.resolve({
          body: {
            '88888888-4444-4444-4444-aaaaaaaaaaa0': {
              100: {
                size: 110,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--110`
              }
            },
            '88888888-4444-4444-4444-aaaaaaaaaaa1': {
              100: {
                size: 110,
                url: `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`
              }
            }
          },
          statusCode: 200,
          options: {
            ids: [
              `88888888-4444-4444-4444-aaaaaaaaaaa0`,
              `88888888-4444-4444-4444-aaaaaaaaaaa1`
            ],
            body: [
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa0`,
                sizes: [100]
              },
              {
                uuid: `88888888-4444-4444-4444-aaaaaaaaaaa1`,
                sizes: [100]
              }
            ]
          }
        }));

        return Promise.all([
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa0`, {size: 100}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa0--110`),
          assert.becomes(avatar.retrieveAvatarUrl(`88888888-4444-4444-4444-aaaaaaaaaaa1`, {size: 100}), `https://example.com/88888888-4444-4444-4444-aaaaaaaaaaa1--110`)
        ])
          .then(() => {
            assert.callCount(spark.request, 1);
          });
      });
    });
  });

});
