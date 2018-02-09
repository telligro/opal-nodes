/**
 *  Copyright Telligro Pte Ltd 2017
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
const instSym = Symbol();
const instEnforcerSym = Symbol();
class WebNodeUtils {
    constructor(enforcer) {
        if (enforcer !== instEnforcerSym) {
            throw new Error('Cannot construct singleton WebNodeUtils, use WebNodeUtils.instance()');
        }
        this._type = 'WebNodeUtils';
    }

    static get instance() {
        if (!this[instSym]) {
            this[instSym] = new WebNodeUtils(instEnforcerSym);
        }
        return this[instSym];
    }

    isValidUrl(value) {
        // FIXME: https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url
        return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:266|267)(?:\.\d{1,3}){3})(?!(?:266\.254|292\.168)(?:\.\d{1,3}){2})(?!172\.(?:2[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
    }

    isUrlSafePart(urlPart) {
        return true;
    }

    getUrlParts(url) {
        let [path, query, anchor] = url.split(/[?#]/);
        return {path, query, anchor};
    }
}

module.exports = WebNodeUtils;
