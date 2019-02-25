//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = {code: 1, description: 'Internal server error'};
const PERMISSION_DENIED_ERROR_CODE = {code: 2, description: 'Permission denied'};
const INVALID_TOKEN_ERROR_CODE = {code: 3, description: 'The token has been invalidated'};
const USER_MISSING_DATA_ERROR_CODE = {code: 21010, description: 'User missing data'};
const USERNAME_ALREADY_USED_CODE = {code: 21011, description: 'Username already used'};
const INVALID_USERNAME_FORMAT_ERROR_CODE = {code: 21012, description: 'Invalid username format'};
const MISSING_BUSINESS_ERROR_CODE = {code: 21013, description: 'Missing business id'};
const EMAIL_ALREADY_USED_ERROR_CODE = {code: 21014, description: 'Email already used'};
const USER_UPDATE_OWN_INFO_ERROR_CODE = {code: 21015, description: 'You cannot update your own info'};
const USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE = {code: 21020, description: 'User belongs to other business'};
const INVALID_USER_CREDENTIALS_OR_TOKEN_ERROR_CODE = {code: 21017, description: 'Invalid user credentials or token'};
const USER_CREDENTIAL_EXIST_ERROR_CODE = {code: 21018, description: 'The user already has an user credentiales'};
const USER_NOT_FOUND_ERROR_CODE = {code: 21019, description: 'The user was not found'};
const USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE = {code: 21020, description: 'The user does not have auth credentials'};
const USER_WAS_NOT_DELETED = {code: 21021, description: 'An error ocurred, user was not deleted'};

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
    constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE , message = '') {
      super(message); 
      this.code = code;
      this.name = name;
      this.method = method;
    }
  
    getContent(){
      return {
        name: this.name,
        code: this.code,
        msg: this.message,      
        method: this.method,
        // stack: this.stack
      }
    }
  };

  class DefaultError extends Error{
    constructor(anyError){
      super(anyError.message)
      this.code = INTERNAL_SERVER_ERROR_CODE.code;
      this.name = anyError.name;
      this.msg = anyError.message;
      // this.stack = anyError.stack;
    }

    getContent(){
      return{
        code: this.code,
        name: this.name,
        msg: this.msg
      }
    }
  }

  module.exports =  { 
    CustomError,
    DefaultError,
    USER_MISSING_DATA_ERROR_CODE,
    USERNAME_ALREADY_USED_CODE,
    EMAIL_ALREADY_USED_ERROR_CODE,
    PERMISSION_DENIED_ERROR_CODE,
    INTERNAL_SERVER_ERROR_CODE,
    INVALID_USERNAME_FORMAT_ERROR_CODE,
    MISSING_BUSINESS_ERROR_CODE,
    USER_UPDATE_OWN_INFO_ERROR_CODE,
    USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
    INVALID_USER_CREDENTIALS_OR_TOKEN_ERROR_CODE,
    USER_CREDENTIAL_EXIST_ERROR_CODE,
    USER_NOT_FOUND_ERROR_CODE,
    USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE,
    USER_WAS_NOT_DELETED,
    USER_WAS_NOT_DELETED,
    INVALID_TOKEN_ERROR_CODE
  } 