'use strict';

module.exports = function debaserConstantCallback(mod) {
  if (this.name && this.stub && mod && mod.constant) {
    return mod.constant(this.name, this.stub);
  }
};

