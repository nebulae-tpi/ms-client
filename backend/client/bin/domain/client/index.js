"use strict";

const ClientCQRS = require("./ClientCQRS")();
const ClientES = require("./ClientES")();

module.exports = {
  /**
   * @returns {ClientCQRS}
   */
  ClientCQRS,
  /**
   * @returns {ClientES}
   */
  ClientES
};
