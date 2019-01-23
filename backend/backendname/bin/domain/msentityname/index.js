"use strict";

const msentitypascalCQRS = require("./msentitypascalCQRS")();
const msentitypascalES = require("./msentitypascalES")();

module.exports = {
  /**
   * @returns {msentitypascalCQRS}
   */
  msentitypascalCQRS,
  /**
   * @returns {msentitypascalES}
   */
  msentitypascalES
};
