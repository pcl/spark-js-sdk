/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

import '../..';

import CiscoSpark from '@ciscospark/spark-core';
import {assert} from '@ciscospark/test-helper-chai';
import testUsers from '@ciscospark/test-helper-test-users';
import uuid from 'uuid';

describe(`plugin-conversation`, function() {
  this.timeout(30000);
  describe(`mercury processing`, () => {
    let kirk, mccoy, participants, spark;

    before(() => testUsers.create({count: 3})
      .then((users) => {
        [kirk, mccoy] = participants = users;

        spark = new CiscoSpark({
          credentials: {
            authorization: mccoy.token
          }
        });

        kirk.spark = new CiscoSpark({
          credentials: {
            authorization: kirk.token
          }
        });

        return Promise.all([
          spark.mercury.connect(),
          kirk.spark.mercury.connect()
        ]);
      }));

    after(() => Promise.all([
      spark && spark.mercury.disconnect(),
      kirk && kirk.spark.mercury.disconnect()
    ]));

    let conversation;
    beforeEach(() => {
      if (conversation) {
        return Promise.resolve();
      }

      return spark.conversation.create({participants})
        .then((c) => {conversation = c;});
    });

    describe(`when an activity is received`, () => {
      it(`is decrypted and normalized @canary`, () => {
        const clientTempId = uuid.v4();
        const promise = new Promise((resolve) => {
          kirk.spark.mercury.on(`event:conversation.activity`, (event) => {
            if (event.data.activity.clientTempId === clientTempId) {
              resolve(event);
            }
          });
        });

        const message = `Dammit Jim, I'm a Doctor not a brick-layer!`;

        spark.conversation.post(conversation, {
          displayName: message
        }, {
          clientTempId
        });

        return assert.isFulfilled(promise)
          .then((event) => {
            assert.isActivity(event.data.activity);
            assert.isEncryptedActivity(event.data.activity);
            assert.equal(event.data.activity.encryptionKeyUrl, conversation.defaultActivityEncryptionKeyUrl);
            assert.equal(event.data.activity.object.displayName, message);
          });
      });
    });
  });
});
