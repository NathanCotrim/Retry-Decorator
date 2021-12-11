// Retry Decorator Implementation =============================================
const { failWhen } = require('./helpers')

    // Helper
const shouldHalt = (retries, attempt) =>
  attempt >= retries

    // Helper
const invokeAction = (config, action, args, attempt) =>
  action(...args)
    .catch(err =>
      shouldHalt(config.retries, attempt)
        ? Promise.reject(err)
        : invokeAction(config, action, args, attempt + 1)
    )


    // Decorator
const retry = (
  config,
  action
) => (...args) =>
  invokeAction(config, action, args, 0)


// Executing ==================================================================
const maybeWillWork = retry(
  { retries: 5 },
  failWhen(.6)
)

console.log('Starting')
maybeWillWork()
  .then(console.log)
  .catch(console.error)