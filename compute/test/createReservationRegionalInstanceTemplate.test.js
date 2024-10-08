/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const path = require('path');
const assert = require('node:assert/strict');
const {after, before, describe, it} = require('mocha');
const cp = require('child_process');
const {getStaleReservations, deleteReservation} = require('./util');

const execSync = cmd => cp.execSync(cmd, {encoding: 'utf-8'});
const cwd = path.join(__dirname, '..');

describe('Create compute reservation using regional instance template', async () => {
  const reservationPrefix = 'regional-reservation';
  const reservationName = `${reservationPrefix}-04bf4ed${Math.floor(Math.random() * 1000 + 1)}`;
  const instanceTemplateName = 'pernament-region-template-name';
  const location = 'regions/us-central1';

  before(async () => {
    // Cleanup resources
    const reservations = await getStaleReservations(reservationPrefix);
    await Promise.all(
      reservations.map(reservation =>
        deleteReservation(reservation.zone, reservation.reservationName)
      )
    );
  });

  after(() => {
    // Delete reservation
    execSync(`node ./reservations/deleteReservation.js ${reservationName}`, {
      cwd,
    });
  });

  it('should create a new reservation', () => {
    const response = execSync(
      `node ./reservations/createReservationInstanceTemplate.js ${reservationName} ${location} ${instanceTemplateName}`,
      {
        cwd,
      }
    );

    assert(response.includes(`Reservation: ${reservationName} created.`));
  });
});
