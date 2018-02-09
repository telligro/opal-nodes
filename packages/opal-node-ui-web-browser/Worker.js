/**
 *  Copyright Telligro Pte Ltd 2017
 *  Copyright (C) 2014 Google Inc. All rights reserved.
 *
 *  This file is part of OPAL.
 *
 *  OPAL is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  OPAL is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OPAL.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @unrestricted
 */
const Common = {};
Common.Worker = class {
  /**
   * @param {string} appName
   */
  constructor(appName) {
    let url = appName + '.js';
    url += Runtime.queryParamsString();

    /** @type {!Promise<!Worker>} */
    this._workerPromise = new Promise((fulfill) => {
      this._worker = new Worker(url);
      this._worker.onmessage = onMessage.bind(this);

      /**
       * @param {!Event} event
       * @this {Common.Worker}
       */
      function onMessage(event) {
        console.assert(event.data === 'workerReady');
        this._worker.onmessage = null;
        fulfill(this._worker);
        // No need to hold a reference to worker anymore as it's stored in
        // the resolved promise.
        this._worker = null;
      }
    });
  }

  /**
   * @param {*} message
   */
  postMessage(message) {
    this._workerPromise.then((worker) => {
      if (!this._disposed) {
        worker.postMessage(message);
      }
    });
  }

  dispose() {
    this._disposed = true;
    this._workerPromise.then((worker) => worker.terminate());
  }

  terminate() {
    this.dispose();
  }

  /**
   * @param {?function(!MessageEvent<*>)} listener
   */
  set onmessage(listener) {
    this._workerPromise.then((worker) => worker.onmessage = listener);
  }

  /**
   * @param {?function(!Event)} listener
   */
  set onerror(listener) {
    this._workerPromise.then((worker) => worker.onerror = listener);
  }
};
