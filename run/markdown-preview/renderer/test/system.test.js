// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const assert = require('assert');
const got = require('got');
const {execSync} = require('child_process');

describe('End-to-End Tests', () => {
  // Retrieve Cloud Run service test config
  const {GOOGLE_CLOUD_PROJECT} = process.env;
  if (!GOOGLE_CLOUD_PROJECT) {
    throw Error('"GOOGLE_CLOUD_PROJECT" env var not found.');
  }
  let {SERVICE_NAME} = process.env;
  if (!SERVICE_NAME) {
    console.log('"SERVICE_NAME" env var not found. Defaulting to "editor"');
    SERVICE_NAME = 'renderer';
  }
  const {ID_TOKEN} = process.env;
  if (!ID_TOKEN) throw Error('ID token not in envvar');
  const {SAMPLE_VERSION} = process.env;
  const {SERVICE_ACCOUNT} = process.env;
  const REGION = 'us-central1';

  let BASE_URL;
  before(async () => {
    // Deploy service using Cloud Build
    let buildCmd =
      `gcloud builds submit --project ${GOOGLE_CLOUD_PROJECT} ` +
      '--config ./test/e2e_test_setup.yaml ' +
      `--substitutions _SERVICE=${SERVICE_NAME},_REGION=${REGION}`;
    if (SAMPLE_VERSION) buildCmd += `,_VERSION=${SAMPLE_VERSION}`;
    if (SERVICE_ACCOUNT) buildCmd += `,_SERVICE_ACCOUNT=${SERVICE_ACCOUNT}`;

    console.log('Starting Cloud Build...');
    execSync(buildCmd, {timeout: 240000}); // timeout at 4 mins
    console.log('Cloud Build completed.');

    // Retrieve URL of Cloud Run service
    const url = execSync(
      `gcloud run services describe ${SERVICE_NAME} --project=${GOOGLE_CLOUD_PROJECT} ` +
        `--region=${REGION} --format='value(status.url)'`
    );
    BASE_URL = url.toString('utf-8').trim();
    if (!BASE_URL) throw Error('Cloud Run service URL not found');
  });

  after(() => {
    let cleanUpCmd =
      `gcloud builds submit --project ${GOOGLE_CLOUD_PROJECT} ` +
      '--config ./test/e2e_test_cleanup.yaml ' +
      `--substitutions _SERVICE=${SERVICE_NAME},_REGION=${REGION}`;
    if (SAMPLE_VERSION) cleanUpCmd += `,_VERSION=${SAMPLE_VERSION}`;
    if (SERVICE_ACCOUNT) cleanUpCmd += `,_SERVICE_ACCOUNT=${SERVICE_ACCOUNT}`;

    execSync(cleanUpCmd);
  });

  it('post(/) without body is a bad request', async () => {
    const options = {
      prefixUrl: BASE_URL.trim(),
      headers: {
        Authorization: `Bearer ${ID_TOKEN.trim()}`,
      },
      method: 'POST',
      retry: 3,
      throwHttpErrors: false,
    };
    const response = await got('', options);
    assert.strictEqual(
      response.statusCode,
      400,
      'Bad Requests status not found'
    );
  });
});
