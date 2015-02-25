# Static Loader
Provides dynamic loading of remote JavaScript and CSS resources

* Loads your files asynchronously, JS and CSS
* Updating CSS files without page reloading
* Fires onload callback when all files is loaded

## Quickstart

1. Add a script tag into your page:
  ```js
  <script src="/js/staticloader.js"></script>
  ```

2. Initialize module:
  ```js
  <script>window.staticLoader = new window.staticLoader();</script>
  ```

3. Use it:
  ```js
  window.staticLoader.load([
    'relative/path/to/file.css',
    'http://external/path/to/file.css',
    '/absolute/path/to/file.js'
  ], function () {
    // onload callback
  });
  ```

### Arguments
#### Files argument

* *as Array* The loads order will be the same order as elements of array
  ```js
  window.staticLoader.load([
    '/path/to/large/file.js',
    '/path/to/small/file.js',
    {
        url: '/path/to/file.css?v=123'    // ?v=123 - used as a fallback version detection
    },
    '/path/to/another.css'
  ]);
  ```

* *as Object*
  ```js
  window.staticLoader.load({
    url: '/path/to/file.css',   // Required.
    id: 'specifiedId',          // Optional. Can be used to update files with different url.
    version: 123                // Required if you want to update CSS file, also can be 
  });                           // included into url with GET parameter "v".
  ```
  
* *as String*
  ```js
    window.staticLoader.load('/path/to/file.css');
  ```
  
#### Function argument
Some logic that should be executed when CSS and JavaScript files will be loaded.
