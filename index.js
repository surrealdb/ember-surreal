'use strict';

const Filter = require('broccoli-persistent-filter');

class SQLFilter extends Filter {

  constructor(inputTree, options) {
    super(inputTree, options);
    this.extensions = ['sql'];
    this.targetExtension = 'js';
  }

  getDestFilePath(path) {
    return null;
  }

  processString(source) {
    return "export default " + JSON.stringify(source) + ";";
  }

}

module.exports = {
  name: 'ember-surreal',
  setupPreprocessorRegistry(type, registry) {
    if (type === 'parent') {
        registry.add('js', {
          name: 'ember-surreal',
          ext: 'sql',
          toTree(tree) {
            return new SQLFilter(tree);
          }
        });
    }
  }
};
