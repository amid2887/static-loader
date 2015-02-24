/*!
 * Static Manager JavaScript module.
 * version 0.0.1
 */
(function (window, userAgent, undefined) {

    'use strict';

    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    var cache = {};

    var defaults = {
        timeout: 5e3,
        pendingInterval: 50
    };

    var itemDefaults = {
        id: null,
        url: undefined,
        node: undefined,
        type: undefined,
        version: 0
    };

    var docHead = document.getElementsByTagName('head')[0];

    var ua = (function (ua) {
        var numberify = function (s) {
                var c = 0;
                return parseFloat(s.replace(/\./g, function () {
                    return (c++ === 1) ? '' : '.';
                }));
            },
            o = {
                ie: 0,
                gecko: 0,
                webkit: 0,
                chrome: 0
            },
            m;

        if (ua) {
            if ((/KHTML/).test(ua)) {
                o.webkit = 1;
            }

            m = ua.match(/AppleWebKit\/([^\s]*)/);
            if (m && m[1]) {
                o.webkit = numberify(m[1]);
                m = ua.match(/(Chrome|CrMo|CriOS)\/([^\s]*)/);

                if (m && m[1] && m[2]) {
                    o.chrome = numberify(m[2]);
                }
            }

            m = ua.match(/Ubuntu\ (\d+\.\d+)/);
            if (m && m[1]) {
                m = ua.match(/\ WebKit\/([^\s]*)/);
                if (m && m[1]) {
                    o.webkit = numberify(m[1]);
                }
                m = ua.match(/\ Chromium\/([^\s]*)/);
                if (m && m[1]) {
                    o.chrome = numberify(m[1]);
                }
            }

            if (!o.webkit) {
                m = ua.match(/MSIE ([^;]*)|Trident.*; rv:([0-9.]+)/);

                if (m && (m[1] || m[2])) {
                    o.ie = numberify(m[1] || m[2]);
                } else {
                    m = ua.match(/Gecko\/([^\s]*)/);
                    if (m) {
                        o.gecko = 1;
                        m = ua.match(/rv:([^\s\)]*)/);
                        if (m && m[1]) {
                            o.gecko = numberify(m[1]);
                        }
                    }
                }
            }
        }

        return o;
    })(userAgent);

    var async = (window.document && window.document.createElement('script').async === true) || (ua.ie >= 10);

    var cssLoad = ((!ua.gecko && !ua.webkit) || ua.gecko >= 9 || ua.webkit > 535.24) && !(ua.chrome && ua.chrome <= 18);

    var parseUrl = (function (link, div) {
        return function (url) {
            link.href = url;

            if (link.protocol === '' || link.host === '') {
                div.innerHTML = '<a></a>';
                div.firstChild.href = url;
                url = div.innerHTML;
                div.innerHTML = url;
                link.href = div.firstChild.href;
            }

            return {
                protocol: link.protocol,
                host: link.host,
                pathname: ('//' + link.pathname).replace(/^\/+/, '/'),
                search: link.search
            }
        }
    })(window.document.createElement('a'), window.document.createElement('div'));

    function cacheItem(item) {
        if (item && item.id) {
            cache[item.id] = item;
        }
    }

    function extend(destination) {
        for (var i = 0, prop, arr = Array.prototype.slice.call(arguments, 1), l = arr.length; i < l; i++) {
            if (arr[i]) {
                for (prop in arr[i]) {
                    if (typeof arr[i][prop] !== 'undefined' && arr[i].hasOwnProperty(prop)) {
                        destination[prop] = arr[i][prop];
                    }
                }
            }
        }
        return destination;
    }

    function extendItem(item) {
        var url, result;

        result = extend({}, itemDefaults, item);

        url = parseUrl(result.url);

        result.url = url.protocol + '//' + url.host + url.pathname + url.search;

        if (!result.id) {
            result.id = (url.host + url.pathname).toLowerCase().replace(/\//gi, '_');
        }

        if (!result.type) {
            result.type = /\.css(?:[?;].*)?$/i.test(url.pathname) ? 'css' : /\.js(?:[?;].*)?$/i.test(url.pathname) ? 'js' : undefined;
        }

        if (!result.version) {
            for (var i = 0, part, arr = url.search.slice(1).split('&'), l = arr.length; i < l; i++) {
                part = arr[i].split('=');
                if (part[0] === 'v') {
                    result.version = parseInt(part[1], 10);
                    break;
                }
            }
        }

        return result;
    }

    function normalizeItem(item) {
        var result = {};
        if (typeof item === 'string') {
            result = extendItem({url: item});
        }
        else if (item && typeof item.url === 'string') {
            result = extendItem(item);
        }
        return result;
    }

    function init(items) {
        if (Array.isArray(items)) {
            for (var i = 0, l = items.length; i < l; i++) {
                cacheItem(normalizeItem(items[i]));
            }
        }
        else {
            cacheItem(normalizeItem(items));
        }
    }

    function Loader(files, options) {
        this.options = extend({}, defaults, options);
        init(files);
    }

    Loader.prototype.load = function (files, callback, options) {
        return new Transaction(files, extend({}, this.options, options), callback);
    };

    function Transaction(files, options, callback) {
        var _self = this;

        _self.id = Transaction.id += 1;
        _self.options = options;
        _self.callback = callback;
        _self.done = false;
        _self.lock = false;
        _self.state = 'new';

        _self.queue = [];
        _self.files = [];

        if (Array.isArray(files)) {
            for (var i = 0, l = files.length; i < l; i++) {
                _self.queue.push(extend(normalizeItem(files[i]), {state: 'init'}));
            }
        }
        else {
            _self.queue.push(normalizeItem(files));
        }

        _self.timeout = window.setTimeout(function () {
            _self.abort();
        }, _self.options.timeout);

        _self.next();
    }

    Transaction.id = 0;

    Transaction.prototype.complete = function () {
        this.done = true;
        for (var i = 0, l = this.files.length; i < l; i++) {
            if (this.files[i].state !== 'done') {
                this.done = false;
                break;
            }
        }
        if (this.done) {
            this.state = 'done';
            this.stop();
        }
    };

    Transaction.prototype.stop = function () {
        this.queue = [];
        window.clearTimeout(this.timeout);
        window.clearTimeout(this.pendingTimeout);

        this.callback(this.files);
    };

    Transaction.prototype.abort = function () {
        this.state = 'aborted';
        this.stop();
    };

    Transaction.prototype.next = function () {
        if (this.lock) {
            return;
        }

        var _self = this,
            item = _self.queue.shift();

        _self.state = 'loading';

        if (item) {
            if (!cache[item.id]) {
                _self.load(item, 'new');
            }
            else if (cache[item.id] && cache[item.id].version < item.version && item.type === 'css') {
                _self.load(item, 'update');
            }
            else {
                _self.next();
            }
        }
        else {
            _self.complete();
        }
    };

    Transaction.prototype.load = function (item, loadType) {
        var _self, node, createElement, isScript;

        _self = this;
        createElement = function (tagName) {
            return window.document.createElement(tagName);
        };
        _self.files.push(item);
        isScript = item.type === 'js';

        if (isScript) {
            node = createElement('script');
        } else if (cssLoad && ua.gecko) {
            node = createElement('style');
        } else {
            node = createElement('link');
        }

        function onError() {
            item.state = 'fail';
            _self.complete();
        }

        function onLoad() {
            if (loadType === 'update') {
                var cacheNode = cache[item.id].node;
                if (cacheNode) {
                    cacheNode.parentNode.removeChild(cacheNode);
                }
                else {
                    var links = window.document.links;
                    for (var i = 0, l = links.length; i < l; i++) {
                        if (links[i].href === cache[item.id].url) {
                            links[i].parentNode.removeChild(links[i]);
                        }
                    }
                }
            }

            item.state = 'done';
            item.node = node;

            cacheItem(item);

            if (_self.queue.length) {
                _self.next();
            }
            else {
                _self.complete();
            }
        }

        if (isScript) {
            node.setAttribute('src', item.url);
            if (async) {
                node.async = false;
            }
            else {
                _self.lock = true;
            }
        } else {
            if (cssLoad && ua.gecko) {
                node.innerHTML = '@import "' + item.url + '";';
            } else {
                node.setAttribute('href', item.url);
                node.setAttribute('rel', 'stylesheet');
            }
        }

        if (isScript && ua.ie && (ua.ie < 9 || (window.document.documentMode && window.document.documentMode < 9))) {
            node.onreadystatechange = function () {
                if (/loaded|complete/.test(node.readyState)) {
                    node.onreadystatechange = null;
                    _self.lock = false;
                    onLoad();
                }
            };
        } else if (!isScript && !cssLoad) {

            _self.pendings = _self.pendings || [];
            item.tempNode = node;

            _self.pendings.push({
                item: item,
                onLoad: onLoad,
                onError: onError
            });

            if (_self.pendingTimeout) {
                _self.next();
            }
            else {

                _self.pendingTimeout = null;

                var pending = function () {

                    for (var i = 0; i < _self.pendings.length; i++) {
                        var pend = _self.pendings[i],
                            item = pend.item;

                        if (ua.webkit) {
                            var sheets = window.document.styleSheets,
                                j = sheets.length,
                                nodeHref = item.tempNode.href;

                            while (--j >= 0) {
                                if (sheets[j].href === nodeHref) {
                                    _self.pendings.splice(i, 1);
                                    i -= 1;
                                    pend.onLoad();
                                    break;
                                }
                            }
                        } else {
                            try {
                                var hasRules = !!item.tempNode.sheet.cssRules;
                                _self.pendings.splice(i, 1);
                                i -= 1;
                                pend.onLoad();
                            } catch (e) {
                            }
                        }
                    }

                    if (_self.pendings.length) {
                        _self.pendingTimeout = window.setTimeout(pending, _self.options.pendingInterval);
                    }

                };

                pending();
            }

        } else {
            if (ua.ie >= 10) {
                node.onload = function () {
                    window.setTimeout(onLoad, 0);
                };
                node.onerror = function () {
                    window.setTimeout(onError, 0);
                };
            } else {
                if (isScript && !async) {
                    _self.lock = false;
                }
                node.onload = onLoad;
                node.error = onError;
            }
        }

        docHead.appendChild(node);

        if (!isScript || async) {
            _self.next();
        }
    };

    window.staticLoader = Loader;

})(window, navigator.userAgent);
