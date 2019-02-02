'use strict';

const Filter = require('broccoli-persistent-filter');

class SQLFilter extends Filter {

  constructor(inputNode, options) {
    super(inputNode, options);
    this.extensions = ['surreal', 'sql'];
    this.targetExtension = 'js';
  }

  processString(source) {
    return "export default " + JSON.stringify(source) + ";";
  }

}

module.exports = {
  name: require('./package').name,
  setupPreprocessorRegistry(type, registry) {
    if (type === "parent") {
      registry.add('js', {
        name: 'ember-surreal',
        ext: ['surreal', 'sql'],
        toTree(tree) {
          return new SQLFilter(tree);
        }
      });
    }
  }
};
